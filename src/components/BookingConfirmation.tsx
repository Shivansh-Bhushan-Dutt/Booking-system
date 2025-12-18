import { Booking } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle, Download, Mail, Calendar, Users, MapPin, CreditCard, Sparkles, PartyPopper } from 'lucide-react';

type BookingConfirmationProps = {
  booking: Booking;
  onBackToTours: () => void;
};

export function BookingConfirmation({ booking, onBackToTours }: BookingConfirmationProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Success Animation */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
          <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-2xl mb-4">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
        </div>
        <PartyPopper className="h-8 w-8 text-yellow-500 mx-auto mb-3 animate-bounce" />
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-3">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600 text-lg max-w-xl mx-auto">
          Your booking has been successfully confirmed. We've sent a confirmation email to{' '}
          <span className="text-blue-600">{booking.customerEmail}</span>
        </p>
      </div>

      <Card className="p-8 mb-6 border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50/30">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
          <div>
            <h3 className="text-gray-900 mb-2">Booking Reference</h3>
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-lg">
              {booking.id}
            </p>
          </div>
          <div className="px-6 py-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
            <span className="text-white flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Payment Confirmed
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Tour</div>
              <div className="text-gray-900">{booking.tourName}</div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Departure Date</div>
              <div className="text-gray-900">{formatDate(booking.departureDate || booking.date)}</div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Travelers</div>
              <div className="text-gray-900">
                {booking.adults} Adult{booking.adults !== 1 ? 's' : ''}
                {booking.children > 0 && `, ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}`}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">Total Amount Paid</div>
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                ₹{booking.totalPrice.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl mb-6 border border-blue-100">
          <h4 className="text-gray-900 mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Customer Details
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-gray-700">
            <div>
              <span className="text-gray-500 text-sm block mb-1">Name</span>
              <span className="text-gray-900">{booking.customerName}</span>
            </div>
            <div>
              <span className="text-gray-500 text-sm block mb-1">Email</span>
              <span className="text-gray-900">{booking.customerEmail}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-gray-500 text-sm block mb-1">Phone</span>
              <span className="text-gray-900">{booking.customerPhone}</span>
            </div>
          </div>
        </div>

        {booking.addons && booking.addons.length > 0 && (
          <div className="mb-6 p-6 bg-white rounded-xl border border-gray-100">
            <h4 className="text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Selected Add-ons
            </h4>
            <ul className="space-y-2">
              {booking.addons.map((addonId) => (
                <li key={addonId} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Add-on: {addonId}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <Button variant="outline" className="flex-1 border-2 hover:border-blue-600 hover:bg-blue-50">
            <Download className="h-4 w-4 mr-2" />
            Download Booking
          </Button>
          <Button variant="outline" className="flex-1 border-2 hover:border-blue-600 hover:bg-blue-50">
            <Mail className="h-4 w-4 mr-2" />
            Email Booking
          </Button>
        </div>
      </Card>

      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 mb-8 text-white shadow-2xl">
        <h4 className="text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          What's Next?
        </h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>You will receive a detailed itinerary via email within 24 hours</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Our travel coordinator will contact you 7 days before departure</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>Please carry a valid ID proof and this booking confirmation</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>For any queries, contact us at support@immersivetrips.com</span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <Button
          onClick={() => window.location.href = 'https://immersivetrips.in'}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
        >
          Browse More Tours
        </Button>
      </div>
    </div>
  );
}