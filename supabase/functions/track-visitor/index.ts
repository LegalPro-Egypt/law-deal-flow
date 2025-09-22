import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisitorData {
  page_path: string;
  referrer_url?: string;
  user_agent: string;
  session_id: string;
  session_duration?: number;
}

interface IpInfoResponse {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  timezone: string;
}

// Admin IPs to exclude (you can add your IP here)
const EXCLUDED_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Add your actual IP address here if known
]);

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'visitor_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getGeolocation(ip: string): Promise<Partial<IpInfoResponse>> {
  try {
    // Using ipinfo.io free tier (50k requests/month)
    const response = await fetch(`https://ipinfo.io/${ip}/json`);
    if (!response.ok) {
      console.log('Geolocation API error:', response.status);
      return {};
    }
    
    const data = await response.json();
    return {
      city: data.city || 'Unknown',
      region: data.region || 'Unknown', 
      country: data.country || 'Unknown',
      loc: data.loc || '',
      org: data.org || '',
      timezone: data.timezone || ''
    };
  } catch (error) {
    console.error('Geolocation lookup failed:', error);
    return {};
  }
}

function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  let device_type = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device_type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device_type = 'tablet';
  }
  
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  
  return { device_type, browser };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const visitorData: VisitorData = await req.json();
    
    // Get real IP from headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    console.log('Tracking visitor from IP:', clientIP);

    // Check if IP should be excluded
    const isExcluded = EXCLUDED_IPS.has(clientIP) || clientIP === 'unknown';
    
    // Hash the IP for privacy
    const visitorHash = await hashIP(clientIP);
    
    // Get geolocation data
    const geoData = await getGeolocation(clientIP);
    
    // Parse user agent
    const { device_type, browser } = parseUserAgent(visitorData.user_agent);

    // Check if visitor already exists
    const { data: existingVisitor } = await supabase
      .from('visitor_analytics')
      .select('*')
      .eq('visitor_hash', visitorHash)
      .eq('session_id', visitorData.session_id)
      .single();

    if (existingVisitor) {
      // Update existing visitor
      const { error } = await supabase
        .from('visitor_analytics')
        .update({
          last_visit: new Date().toISOString(),
          page_views_count: existingVisitor.page_views_count + 1,
          session_duration: visitorData.session_duration || existingVisitor.session_duration,
          page_path: visitorData.page_path, // Update to current page
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVisitor.id);

      if (error) {
        console.error('Error updating visitor:', error);
        throw error;
      }
    } else {
      // Create new visitor record
      const { error } = await supabase
        .from('visitor_analytics')
        .insert({
          visitor_hash: visitorHash,
          country: geoData.country,
          city: geoData.city,
          region: geoData.region,
          user_agent: visitorData.user_agent,
          device_type,
          browser,
          page_path: visitorData.page_path,
          referrer_url: visitorData.referrer_url,
          session_id: visitorData.session_id,
          session_duration: visitorData.session_duration || 0,
          is_excluded: isExcluded,
          ip_info: {
            loc: geoData.loc,
            org: geoData.org,
            timezone: geoData.timezone
          }
        });

      if (error) {
        console.error('Error inserting visitor:', error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        visitor_hash: visitorHash,
        country: geoData.country,
        excluded: isExcluded
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in track-visitor function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});