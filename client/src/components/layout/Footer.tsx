import React from 'react';
import { Link } from '@tanstack/react-router';
import simriLogo from '../../assets/simri_black.png';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { Newsletter } from '../ui/newsletter';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Blog', href: '/blog' },
    ],
    support: [
      { name: 'Contact Us', href: '/contact' },
      { name: 'Returns', href: '/returns' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Refund Policy', href: '/refunds' },
    ],
  };

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'YouTube', icon: Youtube, href: '#' },
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-white border-t border-gray-200">
      <div className="container mx-auto px-6 sm:px-8 lg:px-8">

        {/* Newsletter Section */}
        <div className="py-8 sm:py-12 border-b border-gray-200">
          <div className="max-w-2xl mx-auto">
            <Newsletter
              variant="full"
              title="Stay in the loop"
              description="Get exclusive offers, gift ideas, and the latest updates delivered to your inbox."
              className="bg-transparent border-none shadow-none"
            />
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          
          {/* Brand Section */}
          <div className="sm:col-span-2 lg:col-span-2 mb-8 sm:mb-0">
            <Link to="/" className="flex items-center">
              <img src={simriLogo} alt="Simri" className="h-6 md:h-8 w-auto hover:opacity-90 transition-opacity" />
            </Link>
            <p className="text-gray-800 mb-4 sm:mb-6 max-w-sm text-sm sm:text-base leading-relaxed">
              Discover the joy of giving with our curated collection of premium gifts.
              From heartfelt gestures to grand celebrations, we help you make every moment special.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 text-gray-600">
                <Mail className="h-4 w-4 text-royal-gold flex-shrink-0" />
                <span className="text-sm sm:text-base">hello@simri.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone className="h-4 w-4 text-royal-gold flex-shrink-0" />
                <span className="text-sm sm:text-base">+91 98765 43210</span>
              </div>
              <div className="flex items-start space-x-3 text-gray-600">
                <MapPin className="h-4 w-4 text-royal-gold flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">Mumbai, Maharashtra, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-3 sm:space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="p-2 sm:p-2.5 rounded-lg bg-gray-100 hover:bg-royal-black hover:text-white transition-all duration-300 group"
                    aria-label={social.name}
                  >
                    <Icon className="h-4 w-4 sm:h-4 sm:w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Company Links */}
          <div className="mb-6 sm:mb-0">
            <h4 className="font-heading font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-royal-black transition-colors duration-200 text-sm sm:text-base block py-1"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className="mb-6 sm:mb-0">
            <h4 className="font-heading font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-royal-black transition-colors duration-200 text-sm sm:text-base block py-1"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="mb-6 sm:mb-0">
            <h4 className="font-heading font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-royal-black transition-colors duration-200 text-sm sm:text-base block py-1"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-4 sm:py-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-gray-500 text-xs sm:text-sm text-center sm:text-left">
              © {currentYear} Simri. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
              <img
                src="/images/payment-methods.png"
                alt="Payment methods"
                className="h-5 sm:h-6 opacity-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500">
                  <span>🔒</span>
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500">
                  <span>🚚</span>
                  <span>Free Shipping</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;