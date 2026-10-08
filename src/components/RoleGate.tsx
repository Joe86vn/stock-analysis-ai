'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { FeatureKey, UserRole } from '@/types/auth';
import { hasPermission } from '@/lib/permissions';
import { UpgradePrompt } from '@/components/UpgradePrompt';

interface RoleGateProps {
    feature: FeatureKey;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    featureName?: string;
}

export function RoleGate({
    feature,
    children,
    fallback,
    featureName,
}: RoleGateProps) {
    const { data: session, status } = useSession();

    // Đang tải session thì ẩn nội dung hoặc hiện skeleton nhẹ
    if (status === 'loading') {
        return (
            <div className="w-full py-12 flex items-center justify-center">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
        );
    }

    const role = (session?.user?.role as UserRole) || 'member_free';
    const allowed = hasPermission(role, feature);

    if (allowed) {
        return <>{children}</>;
    }

    if (fallback !== undefined) {
        return <>{fallback}</>;
    }

    return <UpgradePrompt featureName={featureName} />;
}
