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
  user_role?: string;
  screen_resolution?: string;
  timezone?: string;
  language_preferences?: string[];
}

interface BotDetectionResult {
  classification: 'human' | 'likely_human' | 'uncertain' | 'likely_bot' | 'confirmed_bot';
  confidence_score: number;
  detection_reasons: string[];
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

// Admin IPs to exclude (will be updated dynamically)
const EXCLUDED_IPS = new Set([
  '127.0.0.1',
  '::1',
  '178.165.179.221', // Admin IP
]);

// Known bot user agents and patterns
const BOT_PATTERNS = [
  // Search engine crawlers
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  
  // SEO and monitoring tools
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i, /rogerbot/i,
  /screaming frog/i, /sitebulb/i, /deepcrawl/i,
  
  // Headless browsers and automation
  /phantomjs/i, /headlesschrome/i, /puppeteer/i, /playwright/i,
  /selenium/i, /webdriver/i, /chromedriver/i,
  
  // Security scanners
  /nessus/i, /nikto/i, /sqlmap/i, /w3af/i, /burpsuite/i,
  /nuclei/i, /masscan/i, /nmap/i,
  
  // Generic bot indicators
  /bot|crawler|spider|scraper|parser/i,
  /curl|wget|python-requests|go-http-client/i,
  /http|fetch|axios|urllib/i
];

// Suspicious user agent patterns
const SUSPICIOUS_PATTERNS = [
  /^$/,  // Empty user agent
  /^mozilla\/5\.0$/i,  // Too generic
  /windows nt 6\.1.*wow64.*rv:11\.0/i,  // Old suspicious pattern
  /compatible;\s*$/i,  // Incomplete user agent
];

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

function detectBot(visitorData: VisitorData, clientIP: string): BotDetectionResult {
  const reasons: string[] = [];
  let score = 0;
  
  // Check user agent patterns
  const userAgent = visitorData.user_agent || '';
  
  // Confirmed bots (high confidence)
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      reasons.push(`Known bot user agent: ${userAgent.substring(0, 50)}...`);
      score += 80;
      break;
    }
  }
  
  // Suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(userAgent)) {
      reasons.push(`Suspicious user agent pattern`);
      score += 40;
      break;
    }
  }
  
  // Empty or very short user agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Empty or very short user agent');
    score += 60;
  }
  
  // Very long user agent (often bots)
  if (userAgent.length > 500) {
    reasons.push('Unusually long user agent');
    score += 30;
  }
  
  // Session duration analysis
  const duration = visitorData.session_duration || 0;
  if (duration < 2) {
    reasons.push('Very short session duration');
    score += 20;
  } else if (duration === 0) {
    reasons.push('Zero session duration');
    score += 10;
  }
  
  // Referrer analysis
  const referrer = visitorData.referrer_url || '';
  if (!referrer && visitorData.page_path !== '/') {
    reasons.push('No referrer for deep page visit');
    score += 15;
  }
  
  // Missing browser features that humans typically have
  if (!visitorData.screen_resolution) {
    reasons.push('Missing screen resolution data');
    score += 25;
  }
  
  if (!visitorData.timezone) {
    reasons.push('Missing timezone data');
    score += 20;
  }
  
  // IP-based checks
  if (clientIP === 'unknown') {
    reasons.push('Unknown IP address');
    score += 30;
  }
  
  // Classification based on score
  let classification: BotDetectionResult['classification'];
  if (score >= 80) {
    classification = 'confirmed_bot';
  } else if (score >= 50) {
    classification = 'likely_bot';
  } else if (score >= 30) {
    classification = 'uncertain';
  } else if (score >= 10) {
    classification = 'likely_human';
  } else {
    classification = 'human';
  }
  
  return {
    classification,
    confidence_score: Math.min(score, 100),
    detection_reasons: reasons
  };
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

    // Detect bot before other processing
    const botDetection = detectBot(visitorData, clientIP);
    
    // Check if IP should be excluded (admin users)
    const isAdminExcluded = EXCLUDED_IPS.has(clientIP) || visitorData.user_role === 'admin';
    
    // Hash the IP for privacy
    const visitorHash = await hashIP(clientIP);
    
    // Get geolocation data (skip for confirmed bots to save API calls)
    const geoData = botDetection.classification === 'confirmed_bot' 
      ? { country: 'Unknown', city: 'Unknown', region: 'Unknown' }
      : await getGeolocation(clientIP);
    
    // Parse user agent
    const { device_type, browser } = parseUserAgent(visitorData.user_agent);
    
    console.log('Bot detection result:', {
      ip: clientIP,
      classification: botDetection.classification,
      score: botDetection.confidence_score,
      reasons: botDetection.detection_reasons,
      userAgent: visitorData.user_agent?.substring(0, 100)
    });

    // Check if visitor already exists
    const { data: existingVisitor } = await supabase
      .from('visitor_analytics')
      .select('*')
      .eq('visitor_hash', visitorHash)
      .eq('session_id', visitorData.session_id)
      .single();

    if (existingVisitor) {
      // Update existing visitor with enhanced bot detection
      const { error } = await supabase
        .from('visitor_analytics')
        .update({
          last_visit: new Date().toISOString(),
          page_views_count: existingVisitor.page_views_count + 1,
          session_duration: visitorData.session_duration || existingVisitor.session_duration,
          page_path: visitorData.page_path, // Update to current page
          bot_confidence_score: Math.max(existingVisitor.bot_confidence_score || 0, botDetection.confidence_score),
          bot_classification: botDetection.classification,
          detection_reasons: botDetection.detection_reasons,
          meaningful_interaction: botDetection.classification === 'human' || botDetection.classification === 'likely_human',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVisitor.id);

      if (error) {
        console.error('Error updating visitor:', error);
        throw error;
      }
    } else {
      // Create new visitor record with bot detection
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
          is_excluded: false, // General exclusion flag
          is_excluded_admin: isAdminExcluded, // Admin-specific exclusion
          bot_confidence_score: botDetection.confidence_score,
          bot_classification: botDetection.classification,
          detection_reasons: botDetection.detection_reasons,
          meaningful_interaction: botDetection.classification === 'human' || botDetection.classification === 'likely_human',
          screen_resolution: visitorData.screen_resolution,
          timezone: visitorData.timezone,
          language_preferences: visitorData.language_preferences,
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
        excluded: isAdminExcluded,
        bot_detection: {
          classification: botDetection.classification,
          confidence_score: botDetection.confidence_score,
          reasons: botDetection.detection_reasons
        }
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