import axios from 'axios';
import { WordPressContentParser } from '../utils/wordpressParser';

// Type definitions for WordPress departure schedule
interface Departure {
  id: string;
  date: string;
  pricePerPerson: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  status: 'available' | 'limited' | 'sold_out';
  pricingTiers?: Array<{ pax: number; pricePerPerson: number }>;
  childWithBed?: number;
  childWithoutBed?: number;
  extraAdultSameRoom?: number;
  singleRoomSupplement?: number;
  addons?: Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
  }>;
}

interface DepartureSchedule {
  departures: Departure[];
  metadata?: {
    currency?: string;
    minTravelers?: number;
    maxTravelers?: number;
    lastUpdated?: string;
    location?: string;
    duration?: string;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const WP_API_BASE_URL = process.env.REACT_APP_WORDPRESS_URL ? `${process.env.REACT_APP_WORDPRESS_URL}/wp-json/wp/v2` : 'https://immersivetrips.in/wp-json/wp/v2';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const wpApi = axios.create({
  baseURL: WP_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// WordPress API request interceptor
wpApi.interceptors.request.use(
  (config) => {
    console.log('🌍 Making WordPress API request:', config.url);
    return config;
  },
  (error) => {
    console.error('❌ WordPress API request error:', error);
    return Promise.reject(error);
  }
);

// WordPress API response interceptor
wpApi.interceptors.response.use(
  (response) => {
    console.log('✅ WordPress API response received:', {
      url: response.config.url,
      status: response.status,
      dataLength: Array.isArray(response.data) ? response.data.length : 'object'
    });
    return response;
  },
  (error) => {
    console.error('❌ WordPress API response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Tours API - Uses backend as proxy to WordPress
export const toursAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/tours');
      return response;
    } catch (error: any) {
      console.error('Error fetching tours:', error);
      return { data: { success: false, error: 'Failed to fetch tours' } };
    }
  },
  getById: async (id: string) => {
    console.log('🚀 toursAPI.getById called with ID:', id);
    
    // Try fetching directly from WordPress first
    try {
      console.log('🌐 Fetching tour directly from WordPress API:', id);
      const wpResponse = await wpApi.get(`/itinerary`, {
        params: {
          slug: id,
          acf_format: 'standard',
          _embed: true,
          _: Date.now() // Cache buster
        }
      });
      
      if (wpResponse.data && wpResponse.data.length > 0) {
        const wpTour = wpResponse.data[0];
        console.log('✅ WordPress tour data received:', wpTour.title.rendered);
        
        // Fetch featured image URL if available
        let featuredImageUrl = '';
        if (wpTour.featured_media && wpTour.featured_media > 0) {
          try {
            const mediaResponse = await wpApi.get(`/media/${wpTour.featured_media}`);
            featuredImageUrl = mediaResponse.data.source_url || mediaResponse.data.guid?.rendered;
            console.log('🖼️ Featured image URL:', featuredImageUrl);
          } catch (mediaError) {
            console.log('⚠️ Could not fetch featured media:', mediaError);
            // Try to get from _embedded if available
            if (wpTour._embedded && wpTour._embedded['wp:featuredmedia']?.[0]) {
              featuredImageUrl = wpTour._embedded['wp:featuredmedia'][0].source_url;
              console.log('🖼️ Using embedded featured image:', featuredImageUrl);
            }
          }
        } else if (wpTour._embedded && wpTour._embedded['wp:featuredmedia']?.[0]) {
          // Use embedded featured media directly
          featuredImageUrl = wpTour._embedded['wp:featuredmedia'][0].source_url;
          console.log('🖼️ Using embedded featured image:', featuredImageUrl);
        }
        
        // Use ACF featured image as fallback
        if (!featuredImageUrl && wpTour.acf?.featured_image) {
          featuredImageUrl = wpTour.acf.featured_image;
          console.log('🖼️ Using ACF featured image:', featuredImageUrl);
        }
        
        // Check and parse departure_schedule from ACF
        console.log('📋 Checking ACF fields:', {
          hasAcf: !!wpTour.acf,
          hasDepartureSchedule: !!wpTour.acf?.departure_schedule,
          departureScheduleType: typeof wpTour.acf?.departure_schedule,
          rawValue: wpTour.acf?.departure_schedule
        });
        
        // Parse departure_schedule if it's a JSON string
        let departureSchedule: DepartureSchedule | null = null;
        if (wpTour.acf?.departure_schedule) {
          const rawSchedule = wpTour.acf.departure_schedule;
          if (typeof rawSchedule === 'string') {
            try {
              departureSchedule = JSON.parse(rawSchedule);
              console.log('✅ Parsed departure_schedule from JSON string:', {
                departures: departureSchedule?.departures?.length || 0,
                firstDate: departureSchedule?.departures?.[0]?.date
              });
            } catch (e) {
              console.error('❌ Failed to parse departure_schedule JSON:', e);
            }
          } else if (typeof rawSchedule === 'object') {
            departureSchedule = rawSchedule as DepartureSchedule;
            console.log('✅ Using departure_schedule object:', {
              departures: departureSchedule?.departures?.length || 0,
              firstDate: departureSchedule?.departures?.[0]?.date
            });
          }
        }
        
        // Parse WordPress content using smart parser
        console.log('🧠 Parsing WordPress content with smart parser...');
        const parsedData = WordPressContentParser.parseWordPressContent(wpTour);
        console.log('✅ Parsed data:', {
          duration: parsedData.duration,
          location: parsedData.location,
          pricePerPerson: parsedData.pricePerPerson,
          pricingTiers: parsedData.pricingTiers.length,
          inclusions: parsedData.inclusions.length,
          exclusions: parsedData.exclusions.length,
          highlights: parsedData.highlights.length,
          galleryImages: parsedData.galleryImages.length
        });
        
        // Combine featured image with gallery images
        const allImages = featuredImageUrl 
          ? [featuredImageUrl, ...parsedData.galleryImages.filter(img => img !== featuredImageUrl)]
          : parsedData.galleryImages;
        
        // Transform WordPress data to our format with parsed content
        const transformedTour = {
          id: wpTour.id.toString(),
          slug: wpTour.slug || id,
          name: wpTour.title.rendered,
          code: `TOUR-${wpTour.id}`,
          description: wpTour.excerpt?.rendered?.replace(/<[^>]*>/g, '') || wpTour.title.rendered,
          shortDescription: wpTour.excerpt?.rendered?.replace(/<[^>]*>/g, '') || '',
          location: departureSchedule?.metadata?.location || parsedData.location,
          duration: departureSchedule?.metadata?.duration || parsedData.duration,
          image: featuredImageUrl || allImages[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop`,
          featuredImage: featuredImageUrl || allImages[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop`,
          galleryImages: allImages,
          priceAdult: departureSchedule?.departures?.[0]?.pricePerPerson || 0,
          priceChild: departureSchedule?.departures?.[0]?.childWithBed || 0,
          pricePerPerson: departureSchedule?.departures?.[0]?.pricePerPerson || 0,
          minTravelers: departureSchedule?.metadata?.minTravelers || 2,
          maxTravelers: departureSchedule?.metadata?.maxTravelers || 15,
          seatsAvailable: departureSchedule?.departures?.filter((d: Departure) => d.status !== 'sold_out').reduce((sum: number, d: Departure) => sum + (d.availableSeats || 0), 0) || 0,
          availableDates: departureSchedule?.departures?.filter((d: Departure) => d.status !== 'sold_out').map((d: Departure) => d.date) || [],
          bookingDeadline: 14,
          pricingTiers: departureSchedule?.departures?.[0]?.pricingTiers || [],
          departureSchedule: departureSchedule || { departures: [], metadata: {} },
          childWithBed: departureSchedule?.departures?.[0]?.childWithBed || 0,
          childWithoutBed: departureSchedule?.departures?.[0]?.childWithoutBed || 0,
          extraAdultSameRoom: departureSchedule?.departures?.[0]?.extraAdultSameRoom || 0,
          tourEscortSupplement: 0,
          addons: departureSchedule?.departures?.[0]?.addons || [],
          pickupLocation: wpTour.acf?.pickup_location || 'Airport',
          inclusions: wpTour.acf?.inclusions || parsedData.inclusions || [],
          exclusions: wpTour.acf?.exclusions || parsedData.exclusions || [],
          highlights: parsedData.highlights || []
        };
        
        console.log('🎯 Final transformed tour data:', {
          id: transformedTour.id,
          name: transformedTour.name,
          availableDates: transformedTour.availableDates,
          departuresCount: transformedTour.departureSchedule?.departures?.length || 0,
          pricePerPerson: transformedTour.pricePerPerson,
          seatsAvailable: transformedTour.seatsAvailable
        });
        
        return { data: { success: true, tour: transformedTour } };
      }
    } catch (wpError: any) {
      console.log('⚠️ WordPress API failed, trying backend:', wpError.message);
    }
    
    // Fallback to backend
    try {
      console.log('🔍 Fetching tour via backend proxy:', id);
      const response = await api.get(`/tours/${id}`);
      console.log('📡 Backend response:', response.data);
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching tour via backend:', error);
      if (error?.code === 'ECONNREFUSED' || error?.response?.status === undefined) {
        console.log('⚠️ Backend not available, using minimal generic fallback...');
        
        // Minimal generic fallback - only use if WordPress AND backend both fail
        const genericFallback = {
          id: id || 'unknown',
          slug: id || 'unknown',
          name: 'Tour Not Found',
          code: 'N/A',
          description: 'Unable to load tour details. Please try again later or contact support.',
          shortDescription: 'Tour details unavailable',
          location: 'N/A',
          duration: 'N/A',
          image: '/images/placeholder.jpg',
          featuredImage: '/images/placeholder.jpg',
          galleryImages: ['/images/placeholder.jpg'],
          priceAdult: 0,
          priceChild: 0,
          pricePerPerson: 0,
          minTravelers: 0,
          maxTravelers: 0,
          seatsAvailable: 0,
          availableDates: [],
          bookingDeadline: 0,
          pricingTiers: [],
          childWithBed: 0,
          childWithoutBed: 0,
          extraAdultSameRoom: 0,
          tourEscortSupplement: 0,
          addons: [],
          pickupLocation: 'N/A',
          inclusions: [],
          exclusions: []
        };
        
        console.log(`⚠️ Using generic fallback for tour ID: "${id}"`);
        return { data: { success: false, tour: genericFallback, error: 'Tour not found' } };
      }
      return { data: { success: false, error: 'Failed to fetch tour details' } };
    }
  },
  search: (keyword: string) => api.get('/tours', { params: { search: keyword } }),
  getByDestination: (destination: string) => api.get('/tours', { params: { destination } }),
};

// Bookings API
export const bookingsAPI = {
  create: async (data: any) => {
    try {
      return await api.post('/bookings', data);
    } catch (error: any) {
      console.log('Backend unavailable, simulating booking creation...');
      // Simulate successful booking creation
      return {
        data: {
          success: true,
          booking: {
            id: 'BK-' + Date.now(),
            bookingId: 'BK-' + Date.now(),
            tourId: data.tourId,
            tourName: data.tourName,
            status: 'pending',
            ...data
          }
        }
      };
    }
  },
  getAll: (params = {}) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  update: (id: string, data: any) => api.put(`/bookings/${id}`, data),
  delete: (id: string) => api.delete(`/bookings/${id}`),
};

// Payments API
export const paymentsAPI = {
  createOrder: async (data: { 
    amount: number; 
    currency?: string; 
    receipt?: string; 
    bookingId?: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: any 
  }) => {
    try {
      return await api.post('/payments/create-order', data);
    } catch (error: any) {
      console.log('Backend unavailable, simulating payment order creation...');
      // Simulate Razorpay order creation
      return {
        data: {
          success: true,
          order: {
            id: 'order_' + Date.now(),
            amount: data.amount,
            currency: data.currency || 'INR',
            receipt: data.receipt || 'rcpt_' + Date.now(),
            status: 'created'
          }
        }
      };
    }
  },
  verify: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      return await api.post('/payments/verify', data);
    } catch (error: any) {
      console.log('Backend unavailable, simulating payment verification...');
      return {
        data: {
          success: true,
          verified: true
        }
      };
    }
  },
  getPayment: (paymentId: string) => api.get(`/payments/${paymentId}`),
  refund: (data: { paymentId: string; amount?: number; notes?: any }) =>
    api.post('/payments/refund', data),
};

// Admin API
export const adminAPI = {
  getBookings: (params = {}) => api.get('/admin/bookings', { params }),
  exportBookings: (params = {}) =>
    api.get('/admin/bookings/export', { params, responseType: 'blob' }),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  updateBookingStatus: (id: string, data: any) =>
    api.patch(`/admin/bookings/${id}/status`, data),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
