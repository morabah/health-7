# Components Directory Structure

This directory contains all React components used throughout the application, organized into subdirectories based on their purpose and scope.

## Directory Organization

- **ui/**: Basic UI components like buttons, inputs, cards, modals, etc.
- **layout/**: Layout components like headers, footers, navigation, sidebars, etc.
- **shared/**: Components shared across multiple user types or sections
- **patient/**: Components specific to patient user flows and screens
- **doctor/**: Components specific to doctor/healthcare provider user flows and screens
- **admin/**: Components specific to administrative user flows and screens
- **cms/**: Components specific to content management functionality

## Component Guidelines

1. **Component Structure**: Each component should be in its own directory with associated styles, tests, and utilities
2. **Reusability**: Design components to be reusable and composable when possible
3. **Props & Types**: Use TypeScript types/interfaces for component props
4. **Documentation**: Include JSDoc comments for complex components
5. **Accessibility**: Ensure components follow accessibility best practices 