import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, Calendar, User, Award, CheckCircle } from 'lucide-react';
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
  variant?: 'default' | 'modern' | 'health';
  onClick?: () => void;
  hideBookButton?: boolean;
}

/**
 * DoctorCard component for displaying doctor information
 *
 * @example
 * <DoctorCard
 *   doctor={{
 *     id: "123",
 *     firstName: "John",
 *     lastName: "Doe",
 *     specialty: "Cardiologist",
 *     location: "New York, NY",
 *     consultationFee: 150,
 *     rating: 4.8,
 *     reviewCount: 124,
 *     isVerified: true
 *   }}
 * />
 */
const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  className,
  compact = false,
  variant = 'default',
  onClick,
  hideBookButton = false,
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
    languages,
    servicesOffered,
  } = doctor;

  const fullName = `${firstName} ${lastName}`;

  // Modern health-focused doctor card
  if (variant === 'health') {
    return (
      <Card
        className={twMerge(
          clsx(
            'overflow-hidden transition-all duration-200 hover:shadow-lg',
            onClick ? 'cursor-pointer' : '',
            className
          )
        )}
        variant="health"
        onClick={onClick}
      >
        <div className="flex flex-col">
          {/* Doctor image and quick stats */}
          <div className="flex flex-col items-center relative px-4 pt-6 pb-4">
            <div className="relative w-24 h-24 mb-3">
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt={fullName}
                  fill
                  className="rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <User className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
              )}
              {isVerified && (
                <div
                  className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1"
                  aria-label="Verified doctor"
                >
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-center">{fullName}</h3>

            {specialty && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{specialty}</p>
            )}

            {/* Rating */}
            {rating && (
              <div className="flex items-center mt-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium ml-1">{rating}</span>
                {reviewCount && (
                  <span className="text-sm text-slate-500 ml-1">({reviewCount} reviews)</span>
                )}
              </div>
            )}
          </div>

          {/* Doctor details */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30">
            {/* Location */}
            {location && (
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                <span>{location}</span>
              </div>
            )}

            {/* Experience */}
            {experience && (
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                <Award className="w-4 h-4 mr-2 text-slate-400" />
                <span>
                  {typeof experience === 'number' ? `${experience} years experience` : experience}
                </span>
              </div>
            )}

            {/* Languages */}
            {languages && languages.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 mb-2">
                {languages.map(language => (
                  <Badge key={language} variant="secondary" appearance="subtle" size="sm">
                    {language}
                  </Badge>
                ))}
              </div>
            )}

            {/* Services offered */}
            {servicesOffered && servicesOffered.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Services:</p>
                <div className="flex flex-wrap gap-1.5">
                  {servicesOffered.slice(0, 3).map(service => (
                    <Badge
                      key={service}
                      variant="secondary"
                      appearance="outline"
                      size="sm"
                      className="bg-white dark:bg-slate-800"
                    >
                      {service}
                    </Badge>
                  ))}
                  {servicesOffered.length > 3 && (
                    <Badge variant="secondary" appearance="subtle" size="sm">
                      +{servicesOffered.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-4 flex flex-col space-y-2">
            {consultationFee && (
              <p className="text-center mb-2">
                <span className="text-lg font-bold text-primary">${consultationFee}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {' '}
                  per consultation
                </span>
              </p>
            )}

            {!hideBookButton && (
              <Link href={`/book-appointment/${id}`} className="w-full">
                <Button
                  variant="primary"
                  className="w-full"
                  aria-label={`Book appointment with ${fullName}`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </Link>
            )}

            <Link href={`/doctor-profile/${id}`} className="w-full">
              <Button variant="secondary" className="w-full">
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Modern variant with subtle design
  if (variant === 'modern') {
    return (
      <Card
        className={twMerge(
          clsx(
            'overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30',
            onClick ? 'cursor-pointer' : '',
            className
          )
        )}
        variant="outlined"
        onClick={onClick}
      >
        <div className="flex flex-col md:flex-row">
          {/* Doctor image and quick stats */}
          <div className="md:w-1/3 p-4 flex flex-col items-center md:items-start">
            <div className="relative w-20 h-20 mb-3">
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt={fullName}
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
              )}
              {isVerified && (
                <div
                  className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-0.5"
                  aria-label="Verified doctor"
                >
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>

            {rating && (
              <div className="flex items-center mt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium ml-1">{rating}</span>
                {reviewCount && (
                  <span className="text-xs text-slate-500 ml-1">({reviewCount})</span>
                )}
              </div>
            )}
          </div>

          {/* Doctor details */}
          <div className="md:w-2/3 p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">
                  {fullName}
                  {isVerified && (
                    <span className="inline-block ml-2 md:hidden">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </span>
                  )}
                </h3>
                {specialty && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{specialty}</p>
                )}
              </div>

              {consultationFee && !compact && (
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">${consultationFee}</span>
                </div>
              )}
            </div>

            {/* Location */}
            {location && (
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                <span>{location}</span>
              </div>
            )}

            {/* Experience */}
            {experience && !compact && (
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                <Award className="w-4 h-4 mr-1 text-slate-400" />
                <span>
                  {typeof experience === 'number' ? `${experience} years experience` : experience}
                </span>
              </div>
            )}

            {/* Services offered */}
            {servicesOffered && servicesOffered.length > 0 && !compact && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {servicesOffered.slice(0, 3).map(service => (
                    <Badge key={service} variant="secondary" appearance="subtle" size="sm">
                      {service}
                    </Badge>
                  ))}
                  {servicesOffered.length > 3 && (
                    <Badge variant="secondary" appearance="subtle" size="sm">
                      +{servicesOffered.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!compact && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                {!hideBookButton && (
                  <Link href={`/book-appointment/${id}`}>
                    <Button size="sm" aria-label={`Book appointment with ${fullName}`}>
                      <Calendar className="w-4 h-4 mr-1" />
                      Book
                    </Button>
                  </Link>
                )}

                <Link href={`/doctor-profile/${id}`}>
                  <Button variant="secondary" size="sm">
                    <User className="w-4 h-4 mr-1" />
                    Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className={twMerge(clsx('overflow-hidden', onClick ? 'cursor-pointer' : '', className))}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Doctor image */}
        <div className="sm:w-1/4 p-4 flex justify-center sm:justify-start">
          <div className="relative w-20 h-20">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={fullName}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
            )}
            {isVerified && (
              <div
                className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1"
                aria-label="Verified doctor"
              >
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Doctor details */}
        <div className="sm:w-3/4 p-4 pt-0 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">{fullName}</h3>

              {specialty && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{specialty}</p>
              )}

              {/* Rating */}
              {rating && (
                <div className="flex items-center mt-1">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm ml-1">{rating}</span>
                  {reviewCount && (
                    <span className="text-xs text-slate-500 ml-1">({reviewCount} reviews)</span>
                  )}
                </div>
              )}
            </div>

            {consultationFee && (
              <div className="mt-2 sm:mt-0 sm:text-right">
                <span className="text-primary font-bold">${consultationFee}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400"> per visit</span>
              </div>
            )}
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{location}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {!hideBookButton && !compact && (
              <Link href={`/book-appointment/${id}`}>
                <Button size="sm" aria-label={`Book appointment with ${fullName}`}>
                  <Calendar className="w-4 h-4 mr-1" />
                  Book Appointment
                </Button>
              </Link>
            )}

            {!compact && (
              <Link href={`/doctor-profile/${id}`}>
                <Button variant="secondary" size="sm">
                  <User className="w-4 h-4 mr-1" />
                  View Profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DoctorCard;
