'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function initStorageBuckets() {
    try {
        const supabase = createAdminClient()
        
        const buckets = ['property-assets', 'avatars']
        const results = []

        for (const bucketName of buckets) {
            const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName)
            
            if (getError && getError.message.includes('not found')) {
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true,
                    allowedMimeTypes: bucketName === 'property-assets' 
                        ? ['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                        : ['image/*'],
                    fileSizeLimit: 52428800 // 50MB
                })

                if (createError) {
                    results.push({ bucket: bucketName, status: 'error', message: createError.message })
                } else {
                    results.push({ bucket: bucketName, status: 'created' })
                }
            } else if (getError) {
                results.push({ bucket: bucketName, status: 'error', message: getError.message })
            } else {
                results.push({ bucket: bucketName, status: 'exists' })
            }
        }

        return { success: true, results }
    } catch (error: any) {
        console.error('Error initializing storage buckets:', error)
        return { success: false, error: error.message }
    }
}
