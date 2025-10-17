# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-10-17

### Added
- **Multi-Provider Support for AI Intent Node**: ai-intent now supports all 6 AI providers (Perplexity, Claude, Gemini, Grok, DeepSeek, OpenAI) instead of just Perplexity
- Provider selector dropdown in AI Intent node configuration
- Dynamic model selection based on selected provider
- Provider override support via `msg.provider` in AI Intent node
- Enhanced error handling per provider with specific error messages

### Changed
- **Category Update**: AI Intent node moved from "Perplexity AI" to "AI Connect" category for better grouping with AI Chat node
- Updated AI Intent node documentation to reflect multi-provider capabilities
- AI Intent node now consistent with AI Chat node architecture

### Technical Details
- Added `apiHandlers` object with dedicated handlers for each provider
- Implemented dynamic model options based on provider selection
- Added provider-specific error parsing for better debugging
- Updated UI to show provider and model selection

### Benefits
- Users can now choose their preferred AI provider for intent detection
- Mix and match providers (e.g., Gemini for Intent, Claude for Chat)
- Better cost optimization by choosing different providers for different tasks
- Improved error messages for troubleshooting

## [2.1.1] - 2024-10-14

### Previous Release
- AI Chat node with multi-provider support
- AI Config node for centralized API key management
- AI Intent node with Perplexity support (before multi-provider update)

---

## Migration Guide

### From 2.1.x to 2.2.0

No breaking changes! All existing AI Intent nodes will continue to work with Perplexity as the default provider.

**Optional Enhancement:**
If you want to use a different provider for AI Intent:
1. Open your AI Intent node configuration
2. Select your preferred provider from the dropdown
3. Choose appropriate model for that provider
4. Deploy

**Example:**
```javascript
// Before (still works)
AI Intent with Perplexity

// After (new option)
AI Intent with Gemini (faster, free tier available)
AI Intent with Claude (more accurate)
AI Intent with any supported provider
```

### Provider Override

You can dynamically change provider per message:
```javascript
msg.provider = 'gemini';  // Use Gemini for this intent detection
msg.provider = 'claude';  // Use Claude for this intent detection
```
