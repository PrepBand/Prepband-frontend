import { z } from "zod";

const emailField = z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.");

// Must mirror the Supabase project's password strength policy (Authentication
// -> Policies): lowercase, uppercase, digit and special character required.
const newPasswordField = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[0-9]/, "Include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Include at least one special character.");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, "Confirm your password."),
    agreeToTerms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the Terms of Use and Privacy Policy.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code.")
    .regex(/^\d{6}$/, "The code must be 6 digits."),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

const optionalAge = z.string().refine(
  (value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 10 && Number(value) <= 100),
  { message: "Enter an age between 10 and 100." },
);

export const aboutYouSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name."),
    lastName: z.string().trim().min(1, "Enter your last name."),
    gender: z.enum(["male", "female", "prefer_not_to_say", "other"], {
      message: "Choose an option.",
    }),
    age: optionalAge,
    phoneCountryCode: z.string(),
    phoneNumber: z.string(),
    city: z.string().trim().min(1, "Enter your city."),
    country: z.string().trim().min(1, "Enter your country."),
  })
  .refine((data) => !data.phoneNumber || data.phoneCountryCode, {
    message: "Choose a country code for your phone number.",
    path: ["phoneCountryCode"],
  });

export type AboutYouFormValues = z.infer<typeof aboutYouSchema>;

export const studyGoalSchema = z.object({
  examDate: z.string(),
  ieltsType: z.enum(["academic", "general"], { message: "Choose a test type." }),
  preparationLevel: z.enum(["beginner", "intermediate", "advanced"], {
    message: "Choose your preparation level.",
  }),
});

export type StudyGoalFormValues = z.infer<typeof studyGoalSchema>;

export const targetScoresSchema = z.object({
  listening: z.string(),
  reading: z.string(),
  writing: z.string(),
  speaking: z.string(),
  overall: z.string().min(1, "Choose your overall target band."),
});

export type TargetScoresFormValues = z.infer<typeof targetScoresSchema>;
