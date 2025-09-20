import React from 'react';
import { Link } from '@tanstack/react-router';
import { Gift, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { Newsletter } from '../ui/newsletter';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Our Story', href: '/story' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Blog', href: '/blog' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Track Order', href: '/track' },
      { name: 'Returns', href: '/returns' },
      { name: 'Size Guide', href: '/size-guide' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Shipping Policy', href: '/shipping' },
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
    <footer className="bg-gradient-to-b from-gray-50 to-white border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Newsletter Section */}
        <div className="py-12 border-b border-gray-200">
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
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <span className="font-heading text-2xl font-bold text-gradient-primary">
                Simri
              </span>
            </Link>
            <p className="text-gray-600 mb-6 max-w-sm">
              Discover the joy of giving with our curated collection of premium gifts. 
              From heartfelt gestures to grand celebrations, we help you make every moment special.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-600">
                <Mail className="h-4 w-4 text-purple-600" />
                <span>hello@simri.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone className="h-4 w-4 text-purple-600" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <MapPin className="h-4 w-4 text-purple-600" />
                <span>Mumbai, Maharashtra, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4 mt-6">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gradient-primary hover:text-white transition-all duration-300 group"
                    aria-label={social.name}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-purple-600 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-heading font-semibold text-gray-900 mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-purple-600 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-heading font-semibold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-purple-600 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {currentYear} Simri. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 sm:mt-0">
              <img 
                src="/images/payment-methods.png" 
                alt="Payment methods" 
                className="h-6 opacity-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>🔒</span>
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>🚚</span>
                <span>Free Shipping</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;