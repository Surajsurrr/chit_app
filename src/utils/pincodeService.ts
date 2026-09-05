export interface PincodeLookupResult {
  success: boolean;
  city?: string;
  district?: string;
  state?: string;
  postOfficeName?: string;
  error?: string;
}

/**
 * Fast offline dictionary for common Indian postal prefix blocks.
 * Provides instantaneous response and serves as fallback if offline or API is slow.
 */
const OFFLINE_PINCODE_MAP: Record<string, { city: string; district: string; state: string }> = {
  // Chennai & Suburbs (600xxx)
  '600': { city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  // Tiruvallur
  '602': { city: 'Tiruvallur', district: 'Tiruvallur', state: 'Tamil Nadu' },
  // Kanchipuram / Chengalpattu
  '603': { city: 'Chengalpattu', district: 'Chengalpattu', state: 'Tamil Nadu' },
  // Vellore
  '632': { city: 'Vellore', district: 'Vellore', state: 'Tamil Nadu' },
  // Salem
  '636': { city: 'Salem', district: 'Salem', state: 'Tamil Nadu' },
  // Tiruchirappalli
  '620': { city: 'Tiruchirappalli', district: 'Tiruchirappalli', state: 'Tamil Nadu' },
  // Madurai
  '625': { city: 'Madurai', district: 'Madurai', state: 'Tamil Nadu' },
  // Coimbatore
  '641': { city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' },
  // Bengaluru
  '560': { city: 'Bengaluru', district: 'Bengaluru', state: 'Karnataka' },
  // Hyderabad
  '500': { city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' },
  // Mumbai
  '400': { city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra' },
  // Pune
  '411': { city: 'Pune', district: 'Pune', state: 'Maharashtra' },
  // New Delhi
  '110': { city: 'New Delhi', district: 'New Delhi', state: 'Delhi' },
  // Kolkata
  '700': { city: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
  // Ahmedabad
  '380': { city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat' },
  // Jaipur
  '302': { city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan' },
  // Kochi / Ernakulam
  '682': { city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  // Thiruvananthapuram
  '695': { city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala' },
};

/**
 * Automatically fetches City / District details using postal PIN code.
 * Uses official Indian Postal PIN code API (api.postalpincode.in)
 * with instantaneous offline fallback.
 */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult> {
  const cleanPin = pincode.replace(/[^0-9]/g, '').trim();

  if (cleanPin.length !== 6) {
    return { success: false, error: 'Pincode must be exactly 6 digits' };
  }

  const prefix3 = cleanPin.substring(0, 3);
  const offlineMatch = OFFLINE_PINCODE_MAP[prefix3];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        data[0].Status === 'Success' &&
        Array.isArray(data[0].PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const po = data[0].PostOffice[0];
        let city = po.District || po.Division || po.Block || '';

        // All 600xxx series are in the Chennai metropolitan postal zone
        if (cleanPin.startsWith('600')) {
          city = 'Chennai';
        } else if (cleanPin.startsWith('560')) {
          city = 'Bengaluru';
        } else if (cleanPin.startsWith('400')) {
          city = 'Mumbai';
        } else if (cleanPin.startsWith('500')) {
          city = 'Hyderabad';
        } else if (cleanPin.startsWith('110')) {
          city = 'New Delhi';
        } else if (cleanPin.startsWith('700')) {
          city = 'Kolkata';
        }

        return {
          success: true,
          city: city,
          district: po.District || city,
          state: po.State,
          postOfficeName: po.Name,
        };
      }
    }
  } catch (err) {
    // Network lookup failed or timed out; will fall through to offline dictionary
  }

  // Fallback to offline map if network lookup failed or no records found
  if (offlineMatch) {
    return {
      success: true,
      city: offlineMatch.city,
      district: offlineMatch.district,
      state: offlineMatch.state,
    };
  }

  return { success: false, error: 'No location details found for this pincode' };
}
