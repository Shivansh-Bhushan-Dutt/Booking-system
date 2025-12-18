/**
 * Smart WordPress Content Parser
 * Extracts booking information from WordPress HTML content without ACF fields
 */

interface PricingTier {
  pax: number;
  pricePerPerson: number;
}

interface ParsedTourData {
  // Basic Info
  duration?: string;
  location?: string;
  
  // Pricing
  pricePerPerson: number;
  pricingTiers: PricingTier[];
  childWithBed: number;
  childWithoutBed: number;
  extraAdultSameRoom: number;
  singleRoomSupplement: number;
  
  // Lists
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  
  // Images
  galleryImages: string[];
}

export class WordPressContentParser {
  /**
   * Extract duration from title (e.g., "7 Days Immersive Trip to Himachal" -> "7 Days / 6 Nights")
   */
  static extractDuration(title: string, content: string): string {
    // Try to extract from title first
    const titleMatch = title.match(/(\d+)\s*days?/i);
    if (titleMatch) {
      const days = parseInt(titleMatch[1]);
      const nights = days - 1;
      return `${days} Days / ${nights} Nights`;
    }

    // Try to extract from content
    const contentMatch = content.match(/(\d+)\s*days?\s*\/\s*(\d+)\s*nights?/i);
    if (contentMatch) {
      return `${contentMatch[1]} Days / ${contentMatch[2]} Nights`;
    }

    return '7 Days / 6 Nights'; // Default fallback
  }

  /**
   * Extract location from destination taxonomy or content
   */
  static extractLocation(destination: string | undefined, content: string, title: string): string {
    if (destination) {
      return destination;
    }

    // Try to extract from title
    const locationPatterns = [
      /to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /through\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    ];

    for (const pattern of locationPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Look for common destination keywords in content
    const destinations = ['Himachal', 'Kerala', 'Odisha', 'Goa', 'Rajasthan', 'Kashmir', 'Tamil Nadu'];
    for (const dest of destinations) {
      if (title.includes(dest) || content.includes(dest)) {
        return dest;
      }
    }

    return 'India';
  }

  /**
   * Parse pricing table from HTML content
   */
  static parsePricingTable(htmlContent: string): {
    pricingTiers: PricingTier[];
    childWithBed: number;
    childWithoutBed: number;
    extraAdultSameRoom: number;
    singleRoomSupplement: number;
  } {
    const result = {
      pricingTiers: [] as PricingTier[],
      childWithBed: 0,
      childWithoutBed: 0,
      extraAdultSameRoom: 0,
      singleRoomSupplement: 0,
    };

    // Extract pricing data using regex patterns
    const pricePatterns = [
      { pattern: /(\d+)\s*Pax\s+travelling\s+together.*?INR\s*([\d,]+)/gi, type: 'pax' },
      { pattern: /Child\s+with\s+bed.*?INR\s*([\d,]+)/i, type: 'childWithBed' },
      { pattern: /Child\s+without\s+bed.*?INR\s*([\d,]+)/i, type: 'childWithoutBed' },
      { pattern: /Extra\s+adult.*?same\s+room.*?INR\s*([\d,]+)/i, type: 'extraAdult' },
      { pattern: /Single\s+room\s+supplement.*?INR\s*([\d,]+)/i, type: 'singleRoom' },
    ];

    // Parse pax-based pricing tiers
    const paxMatches = Array.from(htmlContent.matchAll(/(\d+)\s*Pax\s+travelling\s+together.*?INR\s*([\d,]+)/gi));
    for (const match of paxMatches) {
      const pax = parseInt(match[1]);
      const price = parseInt(match[2].replace(/,/g, ''));
      result.pricingTiers.push({ pax, pricePerPerson: price });
    }

    // Parse child with bed
    const childWithBedMatch = htmlContent.match(/Child\s+with\s+bed.*?INR\s*([\d,]+)/i);
    if (childWithBedMatch) {
      result.childWithBed = parseInt(childWithBedMatch[1].replace(/,/g, ''));
    }

    // Parse child without bed
    const childWithoutBedMatch = htmlContent.match(/Child\s+without\s+bed.*?INR\s*([\d,]+)/i);
    if (childWithoutBedMatch) {
      result.childWithoutBed = parseInt(childWithoutBedMatch[1].replace(/,/g, ''));
    }

    // Parse extra adult
    const extraAdultMatch = htmlContent.match(/Extra\s+adult.*?same\s+room.*?INR\s*([\d,]+)/i);
    if (extraAdultMatch) {
      result.extraAdultSameRoom = parseInt(extraAdultMatch[1].replace(/,/g, ''));
    }

    // Parse single room supplement
    const singleRoomMatch = htmlContent.match(/Single\s+room\s+supplement.*?INR\s*([\d,]+)/i);
    if (singleRoomMatch) {
      result.singleRoomSupplement = parseInt(singleRoomMatch[1].replace(/,/g, ''));
    }

    return result;
  }

  /**
   * Extract inclusions from HTML content
   */
  static extractInclusions(htmlContent: string): string[] {
    const inclusions: string[] = [];
    
    // Look for the "What's Included" tab section
    const includesMatch = htmlContent.match(/What's Included[\s\S]*?<\/ul>/i);
    if (!includesMatch) return inclusions;

    const includesSection = includesMatch[0];
    
    // Extract list items
    const listItemMatches = Array.from(includesSection.matchAll(/<span class="elementor-icon-list-text">(.*?)<\/span>/g));
    for (const match of listItemMatches) {
      const text = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
      if (text && text.length > 0) {
        inclusions.push(text);
      }
    }

    return inclusions;
  }

  /**
   * Extract exclusions from HTML content
   */
  static extractExclusions(htmlContent: string): string[] {
    const exclusions: string[] = [];
    
    // Look for the "Not Included" tab section
    const excludesMatch = htmlContent.match(/Not Included[\s\S]*?<\/ul>/i);
    if (!excludesMatch) return exclusions;

    const excludesSection = excludesMatch[0];
    
    // Extract list items
    const listItemMatches = Array.from(excludesSection.matchAll(/<span class="elementor-icon-list-text">(.*?)<\/span>/g));
    for (const match of listItemMatches) {
      const text = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
      if (text && text.length > 0) {
        exclusions.push(text);
      }
    }

    return exclusions;
  }

  /**
   * Extract highlights/itinerary overview from content
   */
  static extractHighlights(htmlContent: string, title: string): string[] {
    const highlights: string[] = [];
    
    // Look for itinerary section description
    const itineraryMatch = htmlContent.match(/<h1[^>]*>Itinerary<\/h1>[\s\S]*?<div[^>]*class="[^"]*text-editor[^"]*"[^>]*>(.*?)<\/div>/i);
    if (itineraryMatch) {
      const description = itineraryMatch[1].replace(/<[^>]*>/g, '').trim();
      if (description) {
        // Split into sentences and take first few as highlights
        const sentences = description.split(/\.\s+/).filter(s => s.length > 20);
        highlights.push(...sentences.slice(0, 3).map(s => s.trim() + '.'));
      }
    }

    // Extract day titles as highlights
    const dayMatches = Array.from(htmlContent.matchAll(/Day\s+\d+:\s*([^<]+)/gi));
    let dayCount = 0;
    for (const match of dayMatches) {
      if (dayCount >= 5) break; // Limit to 5 day highlights
      const dayTitle = match[1].trim();
      if (dayTitle && !highlights.some(h => h.includes(dayTitle))) {
        highlights.push(`Visit ${dayTitle}`);
        dayCount++;
      }
    }

    // If no highlights found, create generic ones based on title
    if (highlights.length === 0) {
      highlights.push(`Explore the beauty of ${this.extractLocation('', htmlContent, title)}`);
      highlights.push('Experience local culture and traditions');
      highlights.push('Visit iconic landmarks and attractions');
      highlights.push('Enjoy comfortable accommodations');
      highlights.push('Professional tour guide included');
    }

    return highlights;
  }

  /**
   * Extract gallery images from HTML content
   */
  static extractGalleryImages(htmlContent: string): string[] {
    const images: string[] = [];
    
    // Extract images from carousel/gallery
    const imageMatches = Array.from(htmlContent.matchAll(/style="background-image:\s*url\((?:&#039;|')([^']+)(?:&#039;|')\)/g));
    for (const match of imageMatches) {
      const imageUrl = match[1];
      if (imageUrl && !images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    }

    return images;
  }

  /**
   * Main parsing function - combines all extraction methods
   */
  static parseWordPressContent(wpTour: any): ParsedTourData {
    const htmlContent = wpTour.content?.rendered || '';
    const title = wpTour.title?.rendered || '';
    const destination = wpTour.destination;

    // Extract duration
    const duration = this.extractDuration(title, htmlContent);

    // Extract location
    const location = this.extractLocation(destination, htmlContent, title);

    // Parse pricing
    const pricing = this.parsePricingTable(htmlContent);

    // Extract inclusions and exclusions
    const inclusions = this.extractInclusions(htmlContent);
    const exclusions = this.extractExclusions(htmlContent);

    // Extract highlights
    const highlights = this.extractHighlights(htmlContent, title);

    // Extract gallery images
    const galleryImages = this.extractGalleryImages(htmlContent);

    // Get base price (first tier or default)
    const pricePerPerson = pricing.pricingTiers.length > 0 
      ? pricing.pricingTiers[0].pricePerPerson 
      : 24900;

    return {
      duration,
      location,
      pricePerPerson,
      pricingTiers: pricing.pricingTiers,
      childWithBed: pricing.childWithBed || 14900,
      childWithoutBed: pricing.childWithoutBed || 9900,
      extraAdultSameRoom: pricing.extraAdultSameRoom || 15900,
      singleRoomSupplement: pricing.singleRoomSupplement || 12900,
      inclusions,
      exclusions,
      highlights,
      galleryImages,
    };
  }
}
