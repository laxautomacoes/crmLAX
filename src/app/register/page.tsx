'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInvitationByToken } from '@/app/_actions/invitations';
import { RegisterForm } from './components/RegisterForm';
import { RegisterSuccess } from './components/RegisterSuccess';


import { Suspense } from 'react';
import { RegisterContent } from './components/RegisterContent';

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">Carregando...</div>}>
            <RegisterContent />
        </Suspense>
    );
}

