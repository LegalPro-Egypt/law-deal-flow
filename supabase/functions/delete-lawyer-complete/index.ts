import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteLawyerRequest {
  lawyerId: string
  email: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lawyerId, email }: DeleteLawyerRequest = await req.json()

    if (!lawyerId || !email) {
      throw new Error('lawyerId and email are required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`Starting comprehensive deletion for lawyer: ${email} (ID: ${lawyerId})`)

    // Step 1: Delete from lawyer_requests table
    console.log('Deleting from lawyer_requests...')
    const { error: requestError } = await supabase
      .from('lawyer_requests')
      .delete()
      .eq('email', email)

    if (requestError) {
      console.error('Error deleting lawyer requests:', requestError)
      // Don't throw - this might not exist
    }

    // Step 2: Delete associated documents from storage
    console.log('Deleting associated documents...')
    const { data: profileData } = await supabase
      .from('profiles')
      .select('lawyer_card_front_url, lawyer_card_back_url, profile_picture_url, credentials_documents')
      .eq('id', lawyerId)
      .single()

    if (profileData) {
      const filesToDelete = [
        profileData.lawyer_card_front_url,
        profileData.lawyer_card_back_url,
        profileData.profile_picture_url,
        ...(profileData.credentials_documents || [])
      ].filter(Boolean)

      for (const fileUrl of filesToDelete) {
        if (fileUrl) {
          // Extract bucket and path from URL
          const urlParts = fileUrl.split('/storage/v1/object/public/')
          if (urlParts.length === 2) {
            const [bucketAndPath] = urlParts[1].split('/', 2)
            const [bucket, ...pathParts] = bucketAndPath.split('/')
            const path = pathParts.join('/')
            
            if (bucket && path) {
              console.log(`Deleting file: ${bucket}/${path}`)
              const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([path])
              
              if (storageError) {
                console.error(`Error deleting file ${bucket}/${path}:`, storageError)
              }
            }
          }
        }
      }
    }

    // Step 3: Delete related conversations and messages
    console.log('Deleting related conversations...')
    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('lawyer_id', lawyerId)

    if (conversationError) {
      console.error('Error deleting conversations:', conversationError)
      // Don't throw - this might not exist
    }

    // Step 4: Unassign from any cases
    console.log('Unassigning from cases...')
    const { error: unassignError } = await supabase
      .from('cases')
      .update({ assigned_lawyer_id: null })
      .eq('assigned_lawyer_id', lawyerId)

    if (unassignError) {
      console.error('Error unassigning from cases:', unassignError)
      // Don't throw - continue with deletion
    }

    // Step 5: Delete from profiles table
    console.log('Deleting from profiles...')
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', lawyerId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw new Error(`Failed to delete profile: ${profileError.message}`)
    }

    // Step 6: Delete user from Supabase Auth
    console.log('Deleting from Supabase Auth...')
    const { error: authError } = await supabase.auth.admin.deleteUser(lawyerId)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      // This might fail if user doesn't exist in auth, but that's okay
    }

    console.log(`Successfully completed comprehensive deletion for lawyer: ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Lawyer ${email} has been completely removed from the system` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in delete-lawyer-complete function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})