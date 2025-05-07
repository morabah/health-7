import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, Calendar, User, Award, CheckCircle, MessageSquare } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface DoctorCardProps {
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialty?: string;
    location?: string;
    profilePictureUrl?: string;
    consultationFee?: number;
    rating?: number;
    reviewCount?: number;
    experience?: string | number;
    isVerified?: boolean;
    availableSoon?: boolean; 
    languages?: string[];
    servicesOffered?: string[];
  };
  className?: string;
  compact?: boolean;
  showBookButton?: boolean;
  showViewProfileButton?: boolean;
  actionHref?: string;
  variant?: 'default' | 'neomorphic' | 'health';
}

const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  className,
  compact = false,
  showBookButton = true,
  showViewProfileButton = true,
  actionHref,
  variant = 'default'
}) => {
  const {
    id,
    firstName,
    lastName,
    specialty,
    location,
    profilePictureUrl,
    consultationFee,
    rating,
    reviewCount,
    experience,
    isVerified,
    availableSoon,
    languages,
    servicesOffered
  } = doctor;

  // Default action href is the doctor profile page
  const href = actionHref || `/doctor-profile/${id}`;
  const bookingHref = `/book-appointment/${id}`;
  
  // Full name with Dr. prefix
  const fullName = `Dr. ${firstName} ${lastName}`;

  // Card variants
  const cardVariants = {
    default: "",
    neomorphic: "shadow-[5px_5px_10px_0px_rgba(0,0,0,0.1),-5px_-5px_10px_0px_rgba(255,255,255,0.8)] dark:shadow-[5px_5px_10px_0px_rgba(0,0,0,0.3),-5px_-5px_10px_0px_rgba(30,41,59,0.5)] bg-slate-100 dark:bg-slate-800",
    health: "bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-700 border-l-4 border-primary"
  };

  // Health variant has a different layout
  if (variant === 'health' && !compact) {
    return (
      <Card 
        variant="default"
        bordered
        className={twMerge(
          "overflow-hidden transition-all duration-200 h-full", 
          cardVariants[variant],
          className
        )}
      >
        <div className="p-0">
          {/* Top Section with Image */}
          <div className="relative w-full h-32 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
            <div className="absolute -bottom-12 left-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-md">
                <Image
                  src={profilePictureUrl || "/images/default-doctor.png"}
                  alt={fullName}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            
            {isVerified && (
              <div className="absolute top-3 right-3 bg-white dark:bg-slate-700 text-primary dark:text-primary-400 p-1 rounded-full shadow">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
          </div>
          
          {/* Doctor Info */}
          <div className="pt-14 px-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                  <Link href={href} className="hover:text-primary dark:hover:text-primary-400 transition-colors">
                    {fullName}
                  </Link>
                </h3>
                
                {specialty && (
                  <p className="text-primary-600 dark:text-primary-400 text-sm mt-1">
                    {specialty}
                  </p>
                )}
              </div>
              
              {rating !== undefined && (
                <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full text-sm">
                  <Star className="h-3.5 w-3.5 mr-1 fill-current" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
                  {reviewCount && (
                    <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({reviewCount})</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Key Details in Pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              {location && (
                <div className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">
                  <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                  <span className="truncate max-w-[150px]">{location}</span>
                </div>
              )}
              
              {experience && (
                <div className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">
                  <Award className="h-3 w-3 mr-1 text-slate-400" />
                  <span>
                    {typeof experience === 'number' 
                      ? `${experience} yrs` 
                      : experience}
                  </span>
                </div>
              )}
              
              {consultationFee !== undefined && (
                <div className="inline-flex items-center text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full text-green-600 dark:text-green-400 font-medium">
                  ${consultationFee.toFixed(2)}
                </div>
              )}
            </div>
            
            {/* Services - Show only a few */}
            {servicesOffered && Array.isArray(servicesOffered) && servicesOffered.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Services Offered
                </h4>
                <div className="flex flex-wrap gap-1">
                  {servicesOffered.slice(0, 3).map((service, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      appearance="subtle" 
                      size="xs"
                    >
                      {service}
                    </Badge>
                  ))}
                  {servicesOffered.length > 3 && (
                    <Badge 
                      variant="default" 
                      appearance="subtle" 
                      size="xs"
                    >
                      +{servicesOffered.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            {(showBookButton || showViewProfileButton) && (
              <div className="mt-5 flex gap-2">
                {showViewProfileButton && (
                  <Link href={href} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full"
                      iconLeft={<User className="h-4 w-4" />}
                    >
                      Profile
                    </Button>
                  </Link>
                )}
                
                {showBookButton && (
                  <Link href={bookingHref} className="flex-1">
                    <Button
                      variant="primary"
                      className="w-full"
                      iconLeft={<Calendar className="h-4 w-4" />}
                    >
                      Book
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }
  
  // Neomorphic variant has subtle styling changes
  if (variant === 'neomorphic' && !compact) {
    return (
      <Card 
        variant="default"
        className={twMerge(
          "overflow-hidden transition-all duration-200 h-full border border-slate-200/50 dark:border-slate-700/50", 
          cardVariants[variant],
          className
        )}
      >
        {/* Card content with conditional layouts based on compact prop */}
        <div className="p-5">
          {/* Doctor Image */}
          <div className="flex items-center mb-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mr-3 shadow-inner">
              <Image
                src={profilePictureUrl || "/images/default-doctor.png"}
                alt={fullName}
                fill
                className="object-cover"
              />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                <Link href={href} className="hover:text-primary dark:hover:text-primary-400 transition-colors">
                  {fullName}
                </Link>
              </h3>
              
              {specialty && (
                <p className="text-primary-600 dark:text-primary-400 text-sm">
                  {specialty}
                </p>
              )}
            </div>
            
            {isVerified && (
              <div className="ml-auto bg-white dark:bg-slate-700 text-primary dark:text-primary-400 p-1 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
          </div>
          
          {/* Key stats in a grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {rating !== undefined && (
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 shadow-inner">
                <div className="flex items-center text-yellow-500 dark:text-yellow-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="font-bold ml-1">{rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Rating</span>
              </div>
            )}
            
            {experience && (
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 shadow-inner">
                <div className="flex items-center text-slate-700 dark:text-slate-300">
                  <Award className="h-3.5 w-3.5" />
                  <span className="font-bold ml-1">
                    {typeof experience === 'number' ? experience : '5+'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Years</span>
              </div>
            )}
            
            {consultationFee !== undefined && (
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 shadow-inner">
                <span className="font-bold text-green-600 dark:text-green-400">${consultationFee}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fee</span>
              </div>
            )}
          </div>
          
          {/* Location */}
          {location && (
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-4">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-slate-400" />
              <span className="truncate">{location}</span>
            </div>
          )}
          
          {/* Services */}
          {servicesOffered && Array.isArray(servicesOffered) && servicesOffered.length > 0 && (
            <div className="mt-3 mb-4">
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Services
              </h4>
              <div className="flex flex-wrap gap-1">
                {servicesOffered.slice(0, 3).map((service, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    appearance="subtle" 
                    size="xs"
                  >
                    {service}
                  </Badge>
                ))}
                {servicesOffered.length > 3 && (
                  <Badge 
                    variant="default" 
                    appearance="subtle" 
                    size="xs"
                  >
                    +{servicesOffered.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {(showBookButton || showViewProfileButton) && (
            <div className="flex gap-2 mt-4">
              {showViewProfileButton && (
                <Link href={href} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    iconLeft={<User className="h-4 w-4" />}
                  >
                    Profile
                  </Button>
                </Link>
              )}
              
              {showBookButton && (
                <Link href={bookingHref} className="flex-1">
                  <Button
                    variant="primary"
                    className="w-full"
                    iconLeft={<Calendar className="h-4 w-4" />}
                  >
                    Book
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default card style
  return (
    <Card 
      variant="default"
      bordered
      className={twMerge(
        "overflow-hidden transition-all duration-200 h-full", 
        compact ? "hover:shadow-md" : "hover:shadow-lg hover:-translate-y-1", 
        className
      )}
    >
      {/* Card content with conditional layouts based on compact prop */}
      <div className={clsx(
        "p-5",
        compact ? "flex items-center" : "block"
      )}>
        {/* Doctor Image */}
        <div className={clsx(
          "relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800", 
          compact ? "w-16 h-16 flex-shrink-0 mr-4" : "w-full aspect-[4/3] mb-4"
        )}>
          <Image
            src={profilePictureUrl || "/images/default-doctor.png"}
            alt={fullName}
            fill
            className="object-cover"
          />
          
          {isVerified && (
            <div className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-tl-lg">
              <CheckCircle className="h-4 w-4" />
            </div>
          )}
        </div>
        
        {/* Doctor Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={clsx(
                "font-bold text-slate-900 dark:text-white line-clamp-1", 
                compact ? "text-base" : "text-lg"
              )}>
                <Link href={href} className="hover:text-primary dark:hover:text-primary-400 transition-colors">
                  {fullName}
                </Link>
              </h3>
              
              {specialty && (
                <p className="text-primary-600 dark:text-primary-400 text-sm mt-1">
                  {specialty}
                </p>
              )}
            </div>
            
            {rating !== undefined && !compact && (
              <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded text-sm">
                <Star className="h-3.5 w-3.5 mr-1 fill-current" />
                <span className="font-medium">{rating.toFixed(1)}</span>
                {reviewCount && (
                  <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({reviewCount})</span>
                )}
              </div>
            )}
          </div>
          
          {/* Location */}
          {location && (
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mt-2">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0 text-slate-400" />
              <span className="truncate">{location}</span>
            </div>
          )}
          
          {/* Languages or Other Info - Show only in non-compact mode */}
          {!compact && languages && languages.length > 0 && (
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mt-2">
              <MessageSquare className="h-4 w-4 mr-1 flex-shrink-0 text-slate-400" />
              <span className="truncate">{languages.join(', ')}</span>
            </div>
          )}
          
          {/* Experience */}
          {!compact && experience && (
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mt-2">
              <Award className="h-4 w-4 mr-1 flex-shrink-0 text-slate-400" />
              <span>
                {typeof experience === 'number' 
                  ? `${experience} years experience` 
                  : experience}
              </span>
            </div>
          )}
          
          {/* Consultation Fee - Show only in non-compact mode */}
          {!compact && consultationFee !== undefined && (
            <div className="flex items-center text-sm mt-2">
              <span className="font-medium text-green-600 dark:text-green-400">
                ${consultationFee.toFixed(2)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-1">per visit</span>
            </div>
          )}
          
          {/* Availability Badge */}
          {availableSoon && (
            <div className="mt-2">
              <Badge variant="success" size="sm" appearance="subtle" dot>
                Available soon
              </Badge>
            </div>
          )}
          
          {/* Services - Show only in non-compact mode */}
          {!compact && servicesOffered && Array.isArray(servicesOffered) && servicesOffered.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Services Offered
              </h4>
              <div className="flex flex-wrap gap-1">
                {servicesOffered.slice(0, 3).map((service, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    appearance="subtle" 
                    size="xs"
                  >
                    {service}
                  </Badge>
                ))}
                {servicesOffered.length > 3 && (
                  <Badge 
                    variant="default" 
                    appearance="subtle" 
                    size="xs"
                  >
                    +{servicesOffered.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons - Only in non-compact mode */}
      {!compact && (showBookButton || showViewProfileButton) && (
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          {showViewProfileButton && (
            <Link href={href} className="flex-1">
              <Button
                variant="outline"
                className="w-full"
                iconLeft={<User className="h-4 w-4" />}
              >
                View Profile
              </Button>
            </Link>
          )}
          
          {showBookButton && (
            <Link href={bookingHref} className="flex-1">
              <Button
                variant="primary"
                className="w-full"
                iconLeft={<Calendar className="h-4 w-4" />}
              >
                Book Now
              </Button>
            </Link>
          )}
        </div>
      )}
    </Card>
  );
};

export default DoctorCard; 