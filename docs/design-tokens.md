# Blipz Design Tokens & Component Guidelines

This document outlines the design system used in Blipz to ensure consistency and maintainability across the application.

## Design Tokens

### Spacing Scale (8px Base)
The spacing system is based on an 8px scale for consistent visual rhythm:

```css
--space-1: 0.5rem;   /* 8px */
--space-2: 1rem;     /* 16px */
--space-3: 1.5rem;   /* 24px */
--space-4: 2rem;     /* 32px */
--space-5: 2.5rem;   /* 40px */
--space-6: 3rem;     /* 48px */
--space-8: 4rem;     /* 64px */
--space-10: 5rem;    /* 80px */
--space-12: 6rem;    /* 96px */
--space-16: 8rem;    /* 128px */
```

### Typography Scale
Semantic font sizes with consistent naming:

```css
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.25rem;    /* 20px */
--font-size-xl: 1.5rem;     /* 24px */
--font-size-2xl: 2rem;      /* 32px */
--font-size-3xl: 2.5rem;    /* 40px */
```

### Font Weights
```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Line Heights
```css
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.6;
```

### Color System
Built-in support for light and dark themes:

#### Primary Colors
```css
--primary-color: #6366f1;
--primary-hover: #4f46e5;
--primary-active: #3730a3;
--primary-focus: #6366f1;
--secondary-color: #8b5cf6;
--accent-color: #06b6d4;
```

#### Semantic Colors
```css
--success-color: #10b981;
--warning-color: #f59e0b;
--error-color: #ef4444;
--info-color: #0ea5e9;
```

#### Background Colors
```css
--bg-primary: #ffffff;     /* Main content backgrounds */
--bg-secondary: #f8fafc;   /* Page background */
--bg-tertiary: #f1f5f9;    /* Subtle accents */
--bg-overlay: rgba(0, 0, 0, 0.5);  /* Modal overlays */
```

#### Text Colors
```css
--text-primary: #1e293b;   /* Main content */
--text-secondary: #64748b; /* Secondary content */
--text-muted: #94a3b8;     /* Least prominent text */
--text-inverse: #ffffff;   /* Text on dark backgrounds */
--text-error: #dc2626;     /* Error messages */
--text-success: #059669;   /* Success messages */
```

#### Border Colors
```css
--border-color: #e2e8f0;   /* Default borders */
--border-hover: #cbd5e1;   /* Hover state borders */
--border-focus: #6366f1;   /* Focus state borders */
--border-error: #dc2626;   /* Error state borders */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-focus: 0 0 0 3px rgb(99 102 241 / 0.1);
```

### Border Radius
```css
--radius-sm: 0.375rem;    /* 6px */
--radius-md: 0.5rem;      /* 8px */
--radius-lg: 0.75rem;     /* 12px */
--radius-xl: 1rem;        /* 16px */
--radius-2xl: 1.5rem;     /* 24px */
```

### Transitions
```css
--transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--transition-fast: all 0.15s ease;
```

## Component Guidelines

### Buttons

#### Button Variants
- **Primary**: Main actions (`btn-primary`)
- **Secondary**: Secondary actions (`btn-secondary`)
- **Outline**: Subtle actions (`btn-outline`)

#### Button Sizes
- **Small**: `btn-sm` (32px min-height)
- **Default**: 40px min-height
- **Large**: `btn-lg` (48px min-height)

#### Button States
All buttons include:
- Hover effects with transform and shadow
- Focus states with visible focus ring
- Active (pressed) states
- Disabled states with reduced opacity
- Loading states with spinner

#### Usage Examples
```html
<!-- Primary action -->
<button class="btn btn-primary">Send Message</button>

<!-- Secondary action -->
<button class="btn btn-secondary">Cancel</button>

<!-- Loading state -->
<button class="btn btn-primary loading">Processing...</button>

<!-- Small button -->
<button class="btn btn-secondary btn-sm">Edit</button>
```

### Form Inputs

#### Input States
- Default state with subtle border
- Hover state with darker border
- Focus state with primary color border and focus ring
- Error state with red border and error message
- Disabled state with muted background

#### Input Groups
Use `input-group` class for proper spacing:
```html
<div class="input-group">
    <label for="example">Field Label</label>
    <input type="text" id="example" class="form-input" placeholder="Enter value...">
    <div class="input-error">Error message goes here</div>
</div>
```

### Cards

All major content sections use the `card` class:
- Consistent padding using `--space-3`
- Border radius using `--radius-xl`
- Subtle shadow and hover effects
- Proper border colors for theme support

### Loading States

#### Spinners
- **Default**: 32px spinner
- **Small**: `spinner-sm` (16px)
- **Large**: `spinner-lg` (48px)

#### Skeleton Loading
Use for content placeholders:
```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-avatar"></div>
<div class="skeleton skeleton-button"></div>
```

### Notifications

Accessible toast notifications with:
- Semantic colors (success, error, warning, info)
- Icons for visual identification
- ARIA live regions for screen readers
- Close buttons with proper focus management

```html
<div class="notification success" aria-live="polite">
    <div class="notification-content">
        <div class="notification-title">Success!</div>
        <div class="notification-message">Your message was sent.</div>
    </div>
    <button class="notification-close" aria-label="Close notification">×</button>
</div>
```

## Accessibility Guidelines

### WCAG AA Compliance
- Minimum 4.5:1 color contrast for normal text
- Minimum 3:1 color contrast for large text (18pt+ or 14pt+ bold)
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible

### Screen Reader Support
- Semantic HTML elements (`header`, `main`, `nav`, `article`, etc.)
- ARIA landmarks and labels
- Live regions for dynamic content updates
- Hidden content for screen readers using `sr-only` class

### Keyboard Navigation
- All interactive elements are focusable via Tab key
- Focus management for modal dialogs and menus
- Skip links for main content
- Logical tab order throughout the application

### Touch Targets
- Minimum 44px touch targets on mobile devices
- Adequate spacing between interactive elements
- Proper button and input sizing for touch interaction

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Desktop: ≥ 768px

### Mobile Optimizations
- Larger touch targets (44px minimum)
- Simplified navigation patterns
- Optimized content hierarchy
- Reduced animation for better performance

## Usage Guidelines

### Do's
- Use design tokens instead of hardcoded values
- Follow the 8px spacing scale consistently
- Implement proper hover, focus, and active states
- Include loading states for async operations
- Ensure proper color contrast ratios
- Use semantic HTML elements

### Don'ts
- Don't use arbitrary spacing values
- Don't skip focus states for keyboard users
- Don't use color alone to convey information
- Don't implement custom solutions when design tokens exist
- Don't ignore mobile touch target requirements

## Future Enhancements

Planned improvements to the design system:
1. Component variants for different contexts
2. Additional semantic color tokens
3. Motion design tokens for consistent animations
4. Icon system with accessibility considerations
5. Data visualization color palettes