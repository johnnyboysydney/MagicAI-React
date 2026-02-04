# Feature Flag & Admin Portal System

## Overview

This system allows you to enable/disable features dynamically without deploying new code. It includes:

- **Feature Flag Service**: Centralized feature toggle management
- **Admin Portal**: Web interface to manage feature flags
- **AdSense Integration**: Ready-to-use Google AdSense ads with feature toggling

## Quick Start

### 1. Access Admin Portal

1. Sign in to your app
2. Navigate to `/admin` (Admin button in header for authenticated users)
3. Toggle features on/off as needed

### 2. Configure AdSense

Before enabling ads, update the AdSense configuration:

1. Open `src/app/services/adsense.service.ts`
2. Replace `'ca-pub-XXXXXXXXXXXXXXXXX'` with your actual AdSense client ID
3. Replace the slot IDs with your actual ad slot IDs:
   - `banner`: Main banner ad slot
   - `sidebar`: Sidebar ad slot  
   - `mobile`: Mobile-optimized ad slot
   - `inContent`: In-content ad slot

### 3. Enable Ads

1. Go to Admin Portal (`/admin`)
2. Find "Google AdSense" in the Monetization section
3. Click "Enable" 
4. Ads will now appear on pages where AdSense components are placed

## Feature Categories

### Monetization
- **AdSense**: Google AdSense ads
- **Premium Subscriptions**: Paid tier features  
- **Free Trial**: Trial access to premium features

### AI Features
- **AI Analysis**: Enhanced AI-powered deck analysis
- **AI Deck Builder**: AI-assisted deck building
- **Meta Predictor**: AI predictions for meta shifts

### Social Features
- **Deck Rating**: Allow users to rate decks
- **Deck Comments**: Enable commenting on decks
- **User Profiles**: Enhanced user profile pages
- **Deck Sharing**: Share decks via social media

### Analytics & Tracking
- **Google Analytics**: Track user behavior
- **Error Tracking**: Automatic error reporting
- **Performance Monitoring**: Monitor app performance

### Experimental
- **Deck Versioning**: Track and manage deck versions
- **Bulk Operations**: Bulk edit, delete, and manage decks
- **Advanced Search**: Enhanced search and filtering
- **Offline Mode**: Enable offline functionality

### Development
- **Debug Mode**: Enable debug logging and tools
- **Maintenance Mode**: Put app in maintenance mode
- **Beta Features**: Enable all beta/experimental features

## Using Feature Flags in Code

### Check if Feature is Enabled

```typescript
import { FeatureFlagService } from './services/feature-flag.service';

constructor(private featureFlagService: FeatureFlagService) {}

// Check a specific feature
if (this.featureFlagService.isFeatureEnabled('adsEnabled')) {
  // Feature is enabled
}

// Get all feature flags
this.featureFlagService.getFeatureFlags().subscribe(flags => {
  if (flags.premiumSubscription) {
    // Show premium features
  }
});
```

### Template Usage

```html
<!-- Show content only if feature is enabled -->
<div *ngIf="featureFlagService.isFeatureEnabled('betaFeatures')">
  <p>Beta features content</p>
</div>
```

## Adding AdSense Components

### Basic Usage

```html
<!-- Banner ad -->
<app-adsense 
  adType="banner" 
  adId="unique-ad-id"
  [showLabel]="true">
</app-adsense>

<!-- Sidebar ad -->
<app-adsense 
  adType="sidebar" 
  adId="sidebar-ad">
</app-adsense>

<!-- Mobile-optimized ad -->
<app-adsense 
  adType="mobile" 
  adId="mobile-ad">
</app-adsense>

<!-- In-content ad -->
<app-adsense 
  adType="inContent" 
  adId="content-ad">
</app-adsense>
```

### Properties

- `adType`: Type of ad ('banner', 'sidebar', 'mobile', 'inContent')
- `adId`: Unique identifier for the ad placement
- `showLabel`: Whether to show "Advertisement" label (default: true)
- `fallbackText`: Text to show if ad fails to load

## Environment Behavior

### Development Environment
- Ads are disabled by default
- All experimental features are enabled
- Debug mode is enabled
- Admin portal shows localhost as development

### Production Environment  
- Ads can be enabled via admin portal
- Only stable features enabled by default
- Debug mode disabled
- Admin portal shows production hostname

## Admin Access Control

By default, all authenticated users can access the admin portal for development. 

For production, update `admin-portal.component.ts`:

```typescript
private checkAuthorization(): void {
  this.authService.user$.subscribe(user => {
    // Replace with your admin check logic
    this.isAuthorized = user?.email === 'admin@yourdomain.com' ||
                       user?.email?.endsWith('@yourdomain.com');
    
    // Remove this line in production:
    // this.isAuthorized = true;
  });
}
```

## Feature Flag Persistence

- Feature flag overrides are stored in localStorage
- Overrides persist across browser sessions
- Use "Reset" button to return features to default values
- Use "Export Config" to backup your settings

## Best Practices

1. **Test feature flags locally** before production
2. **Use environment-specific defaults** (dev vs prod)
3. **Monitor feature usage** via admin portal statistics
4. **Gradual rollouts**: Enable features for small user groups first
5. **Document feature dependencies** before deploying

## Troubleshooting

### Ads Not Showing

1. Check if ads are enabled in admin portal
2. Verify AdSense client ID and slot IDs are correct
3. Ensure you're in production environment (ads disabled in dev)
4. Check browser console for AdSense errors
5. Verify domain is approved in Google AdSense

### Admin Portal Access Denied

1. Ensure you're signed in
2. Check authorization logic in `admin-portal.component.ts`
3. For development, the portal should be accessible to all users

### Feature Flags Not Updating

1. Clear localStorage: `localStorage.clear()`
2. Hard refresh the page (Ctrl+F5)
3. Check browser console for errors
4. Verify FeatureFlagService is injected properly

## Security Notes

- Feature flags are client-side and can be manipulated by users
- Never rely on feature flags for security-critical functionality  
- Use server-side validation for sensitive features
- Regularly audit and clean up unused feature flags
