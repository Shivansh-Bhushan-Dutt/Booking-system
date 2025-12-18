import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const PaymentResponse: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('Processing your payment...');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const orderId = searchParams.get('order_id') || searchParams.get('orderId');
      
      if (!orderId) {
        setStatus('failed');
        setMessage('Payment verification failed: No order ID found');
        return;
      }

      // Send all query parameters to backend for verification
      const params: any = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      console.log('Verifying payment with params:', params);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/verify`,
        params
      );

      if (response.data.success) {
        setStatus('success');
        setMessage('Payment verified! Creating your booking...');
        setOrderDetails(response.data);

        // CRITICAL: Create booking after payment verification
        const pendingBooking = sessionStorage.getItem('pendingBooking');
        
        if (!pendingBooking) {
          setStatus('failed');
          setMessage('Booking data not found. Please contact support with Order ID: ' + orderId);
          return;
        }

        try {
          const bookingData = JSON.parse(pendingBooking);
          
          // Create booking with payment details
          const bookingResponse = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bookings`,
            {
              ...bookingData,
              paymentId: orderId,
              paymentStatus: 'confirmed',
              paymentDetails: {
                orderId: orderId,
                paymentMode: response.data.paymentMode,
                paymentStatus: response.data.paymentStatus,
                verifiedAt: new Date().toISOString()
              }
            }
          );

          if (bookingResponse.data.success) {
            sessionStorage.removeItem('pendingBooking');
            setMessage('Booking confirmed! Redirecting...');
            
            // Redirect to home page with booking data
            setTimeout(() => {
              navigate('/', { 
                state: { 
                  confirmedBooking: bookingResponse.data.booking,
                  fromPayment: true 
                }
              });
            }, 2000);
          } else {
            setStatus('failed');
            setMessage('Payment successful but booking failed. Please contact support with Order ID: ' + orderId);
          }
        } catch (bookingError: any) {
          console.error('Booking creation error:', bookingError);
          setStatus('failed');
          setMessage('Payment successful but booking failed. Please contact support with Order ID: ' + orderId);
        }
      } else {
        setStatus('failed');
        setMessage(response.data.error || 'Payment verification failed');
        setOrderDetails(response.data);
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.error || 'Payment verification failed');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return (
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'pending':
        return (
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-20 h-20 mx-auto mb-4">
            <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600"></div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {getStatusIcon()}
        
        <h1 className="text-2xl font-bold text-center mb-2">
          {status === 'loading' && 'Processing Payment'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
          {status === 'pending' && 'Payment Pending'}
        </h1>
        
        <p className="text-gray-600 text-center mb-6">{message}</p>

        {orderDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Order Details:</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Order ID:</span> {orderDetails.orderId}</p>
              {orderDetails.paymentStatus && (
                <p><span className="font-medium">Status:</span> {orderDetails.paymentStatus}</p>
              )}
              {orderDetails.paymentMode && (
                <p><span className="font-medium">Payment Mode:</span> {orderDetails.paymentMode}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {status === 'success' && (
            <p className="text-sm text-center text-gray-500">
              Redirecting to confirmation page in 3 seconds...
            </p>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Home
          </button>

          {status === 'failed' && (
            <button
              onClick={() => navigate(-1)}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResponse;
