'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { logInfo, logError } from '@/lib/logger';
import { UserType, Gender } from '@/types/enums';
import { PatientRegistrationSchema, type PatientRegistrationPayload } from '@/types/schemas';
import { ValidationError } from '@/lib/errors/errorClasses';

/**
 * Patient registration form component
 */
export default function PatientRegisterPage() {
  const router = useRouter();
  const { registerPatient } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  /**
   * Validate form data using Zod schema
   */
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Basic confirmation password check
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Create the registration payload
    const registrationData: PatientRegistrationPayload = {
      email,
      password,
      userType: UserType.PATIENT,
      firstName,
      lastName,
      gender: gender as Gender,
      dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00.000Z` : '',
    };

    // Validate using Zod schema
    const result = PatientRegistrationSchema.safeParse(registrationData);

    if (!result.success) {
      // Extract and format Zod validation errors
      const formattedErrors = result.error.format();

      // Convert Zod errors to our format
      Object.entries(formattedErrors).forEach(([key, value]) => {
        // Skip the _errors top-level property
        if (key !== '_errors') {
          // Use a more specific type instead of any
          interface ZodFieldError {
            _errors: string[];
          }
          const fieldErrors = value as ZodFieldError;
          if (fieldErrors._errors && fieldErrors._errors.length > 0) {
            errors[key] = fieldErrors._errors[0];
          }
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate the form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      logInfo('patient_registration', { email });

      // Format date of birth
      const formattedDateOfBirth = dateOfBirth ? `${dateOfBirth}T00:00:00.000Z` : '';

      // Register patient via auth context
      const registrationResult = await registerPatient({
        email,
        password,
        userType: UserType.PATIENT,
        firstName,
        lastName,
        gender: gender as Gender,
        dateOfBirth: formattedDateOfBirth,
      });

      // Type assertion to avoid TypeScript errors with the response
      type RegistrationResponse = { success: boolean; error?: string };
      const result = registrationResult as unknown as RegistrationResponse;

      if (result.success) {
        // Registration successful, redirect to success page
        router.push(
          `/auth/registration-success?type=${UserType.PATIENT}&email=${encodeURIComponent(email)}`
        );
      } else {
        // Handle unsuccessful registration
        const errorMessage = result.error || 'Registration failed';
        setError(errorMessage);
      }
    } catch (err) {
      logError('Error during patient registration', err);

      // Handle validation errors
      if (err instanceof ValidationError && err.validationErrors) {
        const fieldErrors: { [key: string]: string } = {};

        // Convert validation errors to field-specific errors
        Object.entries(err.validationErrors).forEach(([field, errors]) => {
          if (Array.isArray(errors) && errors.length > 0) {
            fieldErrors[field] = errors[0];
          }
        });

        setValidationErrors(fieldErrors);
        setError('Please correct the validation errors below.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/auth/register">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to options
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Create a Patient Account</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Join our platform to easily book appointments and manage your healthcare
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6" role="alert">
          {error}
        </Alert>
      )}

      <Card className="p-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-labelledby="registration-form-title"
        >
          <div className="sr-only" id="registration-form-title">
            Patient Registration Form
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="First Name"
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                error={validationErrors.firstName}
                autoComplete="given-name"
                required
                aria-required="true"
                aria-invalid={validationErrors.firstName ? 'true' : 'false'}
                aria-describedby={validationErrors.firstName ? 'firstName-error' : undefined}
              />
              {validationErrors.firstName && (
                <div id="firstName-error" className="sr-only">
                  {validationErrors.firstName}
                </div>
              )}
            </div>
            <div>
              <Input
                label="Last Name"
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                error={validationErrors.lastName}
                autoComplete="family-name"
                required
                aria-required="true"
                aria-invalid={validationErrors.lastName ? 'true' : 'false'}
                aria-describedby={validationErrors.lastName ? 'lastName-error' : undefined}
              />
              {validationErrors.lastName && (
                <div id="lastName-error" className="sr-only">
                  {validationErrors.lastName}
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={validationErrors.email}
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={validationErrors.email ? 'true' : 'false'}
            aria-describedby={validationErrors.email ? 'email-error' : undefined}
          />
          {validationErrors.email && (
            <div id="email-error" className="sr-only">
              {validationErrors.email}
            </div>
          )}

          <Input
            label="Phone Number (optional)"
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            error={validationErrors.phone}
            autoComplete="tel"
            placeholder="+1 (123) 456-7890"
            aria-invalid={validationErrors.phone ? 'true' : 'false'}
            aria-describedby={validationErrors.phone ? 'phone-error' : undefined}
          />
          {validationErrors.phone && (
            <div id="phone-error" className="sr-only">
              {validationErrors.phone}
            </div>
          )}

          {/* Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={validationErrors.password}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={validationErrors.password ? 'true' : 'false'}
                aria-describedby={validationErrors.password ? 'password-error' : undefined}
              />
              {validationErrors.password && (
                <div id="password-error" className="sr-only">
                  {validationErrors.password}
                </div>
              )}
              <button
                type="button"
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            <div>
              <Input
                label="Confirm Password"
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={validationErrors.confirmPassword}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={validationErrors.confirmPassword ? 'true' : 'false'}
                aria-describedby={
                  validationErrors.confirmPassword ? 'confirmPassword-error' : undefined
                }
              />
              {validationErrors.confirmPassword && (
                <div id="confirmPassword-error" className="sr-only">
                  {validationErrors.confirmPassword}
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Date of Birth"
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                error={validationErrors.dateOfBirth}
                autoComplete="bday"
                required
                aria-required="true"
                aria-invalid={validationErrors.dateOfBirth ? 'true' : 'false'}
                aria-describedby={validationErrors.dateOfBirth ? 'dateOfBirth-error' : undefined}
              />
              {validationErrors.dateOfBirth && (
                <div id="dateOfBirth-error" className="sr-only">
                  {validationErrors.dateOfBirth}
                </div>
              )}
            </div>
            <div>
              <Select
                label="Gender"
                id="gender"
                value={gender}
                onChange={e => setGender(e.target.value)}
                error={validationErrors.gender}
                required
                aria-required="true"
                aria-invalid={validationErrors.gender ? 'true' : 'false'}
                aria-describedby={validationErrors.gender ? 'gender-error' : undefined}
              >
                <option value="">Select gender</option>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other / Prefer not to say</option>
              </Select>
              {validationErrors.gender && (
                <div id="gender-error" className="sr-only">
                  {validationErrors.gender}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              aria-busy={isSubmitting ? 'true' : 'false'}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>

            <p className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
