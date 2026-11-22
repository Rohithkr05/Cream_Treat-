'use client';

import React, { Suspense } from 'react';
import OrderPage from './order/page';
import { MenuSkeleton } from '@/components/MenuSkeleton';

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF7F2] p-4">
          <MenuSkeleton />
        </div>
      }
    >
      <OrderPage />
    </Suspense>
  );
}
