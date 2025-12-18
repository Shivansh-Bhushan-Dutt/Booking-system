import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TourDetail } from './TourDetail';
import { BookingConfirmation } from './BookingConfirmation';
import { toursAPI, bookingsAPI, paymentsAPI } from '../services/api';
import { Tour, Booking } from '../App';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface BookingWidgetProps {
  tourId: string;
  onClose?: () => void;
}

export function BookingWidget({ tourId, onClose }: BookingWidgetProps) {
  const location = useLocation();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Debug: Log environment variables on component mount
  console.log('🔧 BookingWidget mounted - Environment:', {
    testMode: process.env.REACT_APP_ENABLE_TEST_MODE,
    apiUrl: process.env.REACT_APP_API_URL,
    allEnv: process.env
  });

  useEffect(() => {
    // Check if returning from payment with confirmed booking
    if (location.state?.confirmedBooking && location.state?.fromPayment) {
      console.log('📦 Received confirmed booking from payment:', location.state.confirmedBooking);
      setConfirmedBooking(location.state.confirmedBooking);
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      await fetchTour();
      loadRazorpayScript();
    };
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, location.state]);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchTour = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching tour with ID:', tourId);
      
      const response = await toursAPI.getById(tourId);
      console.log('📡 API Response:', response);
      
      if (response?.data?.success && response.data.tour) {
        console.log('✅ Tour data received:', response.data.tour);
        setTour(response.data.tour);
      } else {
        console.error('❌ API returned success=false or no tour data:', response?.data);
        setError(response?.data?.error || 'Failed to load tour details');
      }
    } catch (err: any) {
      console.error('💥 Error fetching tour:', err);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
      setError(err.response?.data?.error || err.message || 'Failed to load tour details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (bookingData: any) => {
    try {
      console.log('🔄 Starting booking process...', bookingData);
      console.log('🔍 Environment check:', {
        REACT_APP_ENABLE_TEST_MODE: process.env.REACT_APP_ENABLE_TEST_MODE,
        rawValue: process.env.REACT_APP_ENABLE_TEST_MODE,
        isString: typeof process.env.REACT_APP_ENABLE_TEST_MODE,
      });
      
      // Check if test mode is enabled (bypass payment gateway)
      const isTestMode = process.env.REACT_APP_ENABLE_TEST_MODE === 'true';
      console.log('✅ Test mode enabled:', isTestMode);
      
      if (isTestMode) {
        console.log('🧪 TEST MODE: Bypassing payment gateway');
        
        // Create booking directly with confirmed status
        const bookingResponse = await bookingsAPI.create({
          ...bookingData,
          paymentId: `test_payment_${Date.now()}`,
          paymentStatus: 'confirmed',
          paymentDetails: {
            orderId: `test_order_${Date.now()}`,
            paymentId: `test_payment_${Date.now()}`,
            testMode: true
          }
        });

        console.log('✅ Test booking created:', bookingResponse);
        console.log('📋 Response data:', bookingResponse.data);
        console.log('📋 Booking object:', bookingResponse.data.booking);

        if (bookingResponse.data.success) {
          const booking = bookingResponse.data.booking;
          console.log('✅ Booking received:', booking);
          console.log('🆔 Booking ID:', booking.bookingId || booking.id);
          
          setConfirmedBooking(booking);
          
          // Show confirmation page (no auto-redirect)
          console.log('✅ Booking confirmed, showing confirmation page');
          console.log('📧 Confirmation emails sent to:', bookingData.customerEmail, 'and admin');
        } else {
          throw new Error('Failed to create test booking');
        }
        return;
      }
      
      // Live payment flow - Create payment order
      console.log('💳 LIVE MODE: Creating payment order...');
      
      // Create payment order
      const orderResponse = await paymentsAPI.createOrder({
        amount: bookingData.totalPrice,
        currency: 'INR',
        receipt: `booking_${Date.now()}`,
        bookingId: `booking_${Date.now()}`,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        notes: {
          tourId: bookingData.tourId,
          tourName: bookingData.tourName,
          customerEmail: bookingData.customerEmail
        }
      });

      console.log('📦 Order response:', orderResponse);

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.error || 'Failed to create payment order');
      }

      const { order, paymentMode, paymentLink, redirectUrl } = orderResponse.data;

      // HDFC Payment Gateway - Redirect to payment page
      if (paymentMode === 'HDFC' && (paymentLink || redirectUrl)) {
        console.log('🏦 HDFC Payment: Redirecting to payment gateway');
        
        // Store booking data in sessionStorage for later retrieval
        sessionStorage.setItem('pendingBooking', JSON.stringify({
          ...bookingData,
          orderId: order.id,
          paymentMode: 'HDFC'
        }));
        
        // Redirect to HDFC payment page
        window.location.href = paymentLink || redirectUrl;
        return;
      }

      // Razorpay Payment Gateway
      if (paymentMode === 'RAZORPAY') {
        const { key } = orderResponse.data;
        console.log('💳 Razorpay Payment: Opening payment dialog');
        
        // Initialize Razorpay
        const options = {
          key: key || process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: 'Immersive Trips',
          description: bookingData.tourName,
          order_id: order.id,
          prefill: {
            name: bookingData.customerName,
            email: bookingData.customerEmail,
            contact: bookingData.customerPhone
          },
          theme: {
            color: '#667eea'
          },
          handler: async function (response: any) {
            try {
              // Verify payment
              const verifyResponse = await paymentsAPI.verify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyResponse.data.success) {
                // Create booking
                const bookingResponse = await bookingsAPI.create({
                  ...bookingData,
                  paymentId: response.razorpay_payment_id,
                  paymentStatus: 'confirmed',
                  paymentDetails: {
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature
                  }
                });

                console.log('✅ Booking created:', bookingResponse);

                if (bookingResponse.data.success) {
                  const booking = bookingResponse.data.booking;
                  setConfirmedBooking(booking);
                  
                  // Redirect to WordPress tours page after 3 seconds
                  setTimeout(() => {
                    window.location.href = 'https://immersivetrips.in';
                  }, 9000);
                } else {
                  throw new Error('Failed to create booking');
                }
              } else {
                throw new Error('Payment verification failed');
              }
            } catch (err: any) {
              console.error('Error processing booking:', err);
              alert('Payment successful but booking failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
            }
          },
        modal: {
          ondismiss: function () {
            console.log('Payment cancelled by user');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      }
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      throw new Error(err.response?.data?.error || 'Failed to initiate payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tour details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-red-800 text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchTour}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <BookingConfirmation
        booking={confirmedBooking}
        onBackToTours={() => {
          setConfirmedBooking(null);
          if (onClose) onClose();
        }}
      />
    );
  }

  if (!tour) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Tour not found</p>
      </div>
    );
  }

  return (
    <TourDetail
      tour={tour}
      onBookingComplete={handleBooking}
      onBack={() => {
        if (onClose) onClose();
      }}
    />
  );
}
