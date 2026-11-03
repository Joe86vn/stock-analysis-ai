const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function askPassword(query) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    process.stdout.write(query);
    const isTTY = Boolean(process.stdin.isTTY);
    if (isTTY) {
      process.stdin.setRawMode(true);
    }
    let password = '';
    const onData = chunk => {
      const char = chunk.toString();
      if (char === '\r' || char === '\n') {
        if (isTTY) process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(password.trim());
      } else if (char === '\u0003') { // Ctrl+C
        process.exit();
      } else if (char === '\b' || char === '\x7f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('====================================================');
  console.log('       MASVN MCP AUTHENTICATOR (AN TOÀN CỤC BỘ)    ');
  console.log('====================================================');
  console.log('Thông tin tài khoản & mật khẩu của bạn CHỈ gửi trực');
  console.log('tiếp tới máy chủ MASVN (https://mcp.masvn.com).');
  console.log('Không ghi log, không gửi cho bất kỳ bên thứ ba nào.');
  console.log('----------------------------------------------------\n');

  const username = await askQuestion('👤 Nhập Số tài khoản MASVN (VD: 077C...): ');
  if (!username) {
    console.error('❌ Số tài khoản không được để trống.');
    process.exit(1);
  }

  const password = await askPassword('🔑 Nhập Mật khẩu giao dịch: ');
  if (!password) {
    console.error('❌ Mật khẩu không được để trống.');
    process.exit(1);
  }

  console.log('\n⏳ Đang khởi tạo phiên xác thực bảo mật với MASVN...');
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  const state = base64URLEncode(crypto.randomBytes(16));

  const authUrl = `https://mcp.masvn.com/authorize?response_type=code&client_id=${encodeURIComponent('https://claude.ai/oauth/mcp-oauth-client-metadata')}&redirect_uri=${encodeURIComponent('https://claude.ai/api/mcp/auth_callback')}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

  const res1 = await fetch(authUrl, { redirect: 'manual' });
  const loc1 = res1.headers.get('location');
  if (!loc1) {
    console.error('❌ Lỗi khởi tạo phiên xác thực từ MASVN.');
    process.exit(1);
  }

  const res2 = await fetch(loc1, { redirect: 'manual' });
  const loc2 = res2.headers.get('location');
  if (!loc2) {
    console.error('❌ Không thể lấy link đăng nhập MASVN.');
    process.exit(1);
  }

  const loginUrl = new URL(loc2, 'https://mcp.masvn.com');
  const loginId = loginUrl.searchParams.get('login_id');
  if (!loginId) {
    console.error('❌ Không tìm thấy login_id.');
    process.exit(1);
  }

  console.log('⏳ Đang gửi yêu cầu đăng nhập tới MASVN...');
  const loginRes = await fetch('https://mcp.masvn.com/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login_id: loginId,
      username: username,
      password: password
    })
  });

  const loginData = await loginRes.json();
  if (loginData.error) {
    console.error(`❌ Đăng nhập thất bại: ${loginData.error_description || loginData.error}`);
    process.exit(1);
  }

  let redirectUrl = loginData.redirect;

  if (loginData.otpRequired) {
    console.log('\n📲 MASVN yêu cầu mã xác thực OTP.');
    const otp = await askQuestion('👉 Nhập mã OTP đã nhận: ');
    console.log('⏳ Đang xác thực OTP...');
    const otpRes = await fetch('https://mcp.masvn.com/oauth/login/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_id: loginId,
        otp: otp
      })
    });
    const otpData = await otpRes.json();
    if (otpData.error) {
      console.error(`❌ Xác thực OTP thất bại: ${otpData.error_description || otpData.error}`);
      process.exit(1);
    }
    redirectUrl = otpData.redirect;
  }

  if (!redirectUrl) {
    console.error('❌ Không nhận được link chuyển hướng sau khi đăng nhập.');
    process.exit(1);
  }

  console.log('⏳ Đang lấy mã ủy quyền...');
  const resCallback = await fetch(redirectUrl, { redirect: 'manual' });
  const finalRedirect = resCallback.headers.get('location') || redirectUrl;
  const finalUrl = new URL(finalRedirect);
  const authCode = finalUrl.searchParams.get('code');

  if (!authCode) {
    console.error('❌ Không trích xuất được authorization code.');
    process.exit(1);
  }

  console.log('⏳ Đang đổi Access Token chính thức từ MAS-MCP...');
  const tokenRes = await fetch('https://mcp.masvn.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code: authCode,
      code_verifier: codeVerifier
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('❌ Đổi token thất bại:', tokenData);
    process.exit(1);
  }

  console.log('\n🎉 ĐÃ LẤY ACCESS TOKEN THÀNH CÔNG!');
  console.log(`Loại Token: ${tokenData.token_type || 'Bearer'}`);
  console.log(`Thời hạn: ${tokenData.expires_in ? Math.round(tokenData.expires_in / 86400) + ' ngày' : 'Theo phiên'}`);

  // Cập nhật .env.local trong dự án
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('MASVN_TOKEN=')) {
        envContent = envContent.replace(/MASVN_TOKEN=.*/g, `MASVN_TOKEN=Bearer ${tokenData.access_token}`);
      } else {
        envContent += `\nMASVN_TOKEN=Bearer ${tokenData.access_token}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`✅ Đã tự động cập nhật token vào .env.local!`);
    }
  } catch (err) {
    console.warn('⚠️ Không thể cập nhật .env.local:', err.message);
  }

  // Cập nhật C:\Users\Nguyen joe\.gemini\config\mcp_config.json
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  const configPath = path.join(homeDir, '.gemini', 'config', 'mcp_config.json');

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.mcpServers = config.mcpServers || {};
    config.mcpServers.masvn = {
      url: 'https://mcp.masvn.com/mcp',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ Đã tự động cập nhật cấu hình Antigravity tại:`);
    console.log(`   ${configPath}`);
  } else {
    console.log('⚠️ Không tìm thấy mcp_config.json, hãy copy token này:');
    console.log(tokenData.access_token);
  }

  console.log('\n====================================================');
  console.log('  KẾT NỐI MAS-MCP VÀO ANTIGRAVITY HOÀN TẤT 100%!   ');
  console.log('  Bây giờ bạn có thể chat và gọi 40 tools MASVN!    ');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('❌ Đã xảy ra lỗi không mong muốn:', err.message);
  process.exit(1);
});

