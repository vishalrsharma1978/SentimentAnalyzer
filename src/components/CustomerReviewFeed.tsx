import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { translateReviewText } from '../data/liveData';
import type { CustomerSentiment, ReviewTranslation } from '../data/liveData';
import { SafeView } from './SafeView';

const sentimentTheme = {
  positive: { color: '#027A48', soft: '#ECFDF3', border: '#A6F4C5', icon: 'happy-outline' as const },
  neutral: { color: '#F79009', soft: '#FFFAEB', border: '#FEDF89', icon: 'remove-outline' as const },
  negative: { color: '#B42318', soft: '#FEF3F2', border: '#FECDCA', icon: 'sad-outline' as const },
};

type CustomerReviewFeedProps = {
  reviews: CustomerSentiment[];
  highlightedReview?: CustomerSentiment | null;
  autoTranslateReview?: CustomerSentiment | null;
};

export function CustomerReviewFeed({
  reviews,
  highlightedReview = null,
  autoTranslateReview = null,
}: CustomerReviewFeedProps) {
  const { width } = useWindowDimensions();
  const compact = width < 700;

  return (
    <SafeView style={styles.feed}>
      {reviews.map((review, index) => (
        <ReviewCard
          key={`${review.source}-${review.author}-${index}-${review.text}`}
          review={review}
          compact={compact}
          highlighted={review === highlightedReview}
          autoTranslate={review === autoTranslateReview}
          isLast={index === reviews.length - 1}
        />
      ))}
    </SafeView>
  );
}

function ReviewCard({
  review,
  compact,
  highlighted,
  autoTranslate,
  isLast,
}: {
  review: CustomerSentiment;
  compact: boolean;
  highlighted: boolean;
  autoTranslate: boolean;
  isLast: boolean;
}) {
  const theme = sentimentTheme[review.sentiment];
  const [translation, setTranslation] = useState<ReviewTranslation | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const autoTranslationStarted = useRef(false);
  const initials = review.author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';
  const detectedLanguage = translation?.detectedSourceLanguage.toLowerCase().split('-')[0];

  const translate = useCallback(async () => {
    if (isTranslating) return;
    setIsTranslating(true);
    setTranslationError(null);
    try {
      setTranslation(await translateReviewText(review.text));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Translation is temporarily unavailable.';
      setTranslationError(message);
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslating, review.text]);

  useEffect(() => {
    if (!autoTranslate || autoTranslationStarted.current || translation || isTranslating) return undefined;

    const request = setTimeout(() => {
      if (autoTranslationStarted.current) return;
      autoTranslationStarted.current = true;
      void translate();
    }, 0);
    return () => clearTimeout(request);
  }, [autoTranslate, isTranslating, translate, translation]);

  return (
    <SafeView style={[styles.reviewCard, compact && styles.reviewCardCompact]}>
      <SafeView style={styles.timelineRail}>
        <SafeView style={[styles.timelineDot, { backgroundColor: theme.color, borderColor: theme.soft }]}>
          <Ionicons name={theme.icon} size={14} color="#FFFFFF" />
        </SafeView>
        {!isLast && <SafeView style={styles.timelineLine} />}
      </SafeView>
      <SafeView style={[styles.cardBody, { borderColor: highlighted ? '#509EE3' : theme.border }, highlighted && styles.highlightedCard]}>
        <SafeView style={styles.cardTop}>
          <SafeView style={styles.authorBlock}>
            <SafeView style={[styles.avatar, { backgroundColor: theme.soft }]}>
              <Text style={[styles.avatarText, { color: theme.color }]}>{initials}</Text>
            </SafeView>
            <SafeView style={styles.authorCopy}>
              <Text style={styles.author}>{review.author}</Text>
              <SafeView style={styles.sourceRow}>
                <Ionicons
                  name={review.source.includes('Apple') ? 'logo-apple' : review.source.includes('Google') ? 'logo-google-playstore' : 'chatbubble-outline'}
                  size={11}
                  color="#667085"
                />
                <Text style={styles.source}>{review.source}</Text>
              </SafeView>
            </SafeView>
          </SafeView>
          <SafeView style={[styles.sentimentBadge, { backgroundColor: theme.soft }]}>
            <SafeView style={[styles.sentimentDot, { backgroundColor: review.sentiment === 'neutral' ? '#F79009' : theme.color }]} />
            <Text style={[styles.sentimentText, { color: review.sentiment === 'neutral' ? '#B54708' : theme.color }]}>{review.sentiment}</Text>
          </SafeView>
        </SafeView>
        <Text style={styles.reviewText}>{review.text || 'No review text was returned by the source.'}</Text>

        {translation && detectedLanguage !== 'en' && (
          <SafeView accessibilityLabel="English translation" style={styles.translationBubble}>
            <SafeView style={styles.translationHeader}>
              <Ionicons name="language-outline" size={13} color="#175CD3" />
              <Text style={styles.translationTitle}>English translation</Text>
              <Text style={styles.languageTag}>{translation.detectedSourceLanguage.toUpperCase()}</Text>
            </SafeView>
            <Text style={styles.translationText}>{translation.translatedText}</Text>
          </SafeView>
        )}
        {translation && detectedLanguage === 'en' && (
          <Text accessibilityLiveRegion="polite" style={styles.translationInfo}>This comment is already in English.</Text>
        )}
        {translationError && (
          <Text accessibilityLiveRegion="polite" style={styles.translationError}>
            Translation unavailable: {translationError}
          </Text>
        )}

        <SafeView style={styles.cardFooter}>
          <SafeView style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={review.rating >= star ? 'star' : review.rating >= star - 0.5 ? 'star-half' : 'star-outline'}
                size={12}
                color={review.rating > 0 ? '#F79009' : '#98A2B3'}
              />
            ))}
          </SafeView>
          {review.rating > 0 && <Text style={styles.ratingValue}>{review.rating.toFixed(1)} / 5</Text>}
          <Text style={styles.verified}>Verified recent content</Text>
        </SafeView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isTranslating ? 'Translating comment' : 'Translate comment to English'}
          disabled={isTranslating}
          onPress={() => void translate()}
          style={({ pressed }) => [styles.translateButton, pressed && styles.translateButtonPressed]}
        >
          <Ionicons name={isTranslating ? 'sync-outline' : 'language-outline'} size={13} color="#175CD3" />
          <Text style={styles.translateButtonText}>{isTranslating ? 'Translating…' : translationError ? 'Try translation again' : 'Translate to English'}</Text>
        </Pressable>
      </SafeView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  feed: { paddingTop: 8 },
  reviewCard: { flexDirection: 'row', minHeight: 118, paddingRight: 8 },
  reviewCardCompact: { paddingRight: 2 },
  timelineRail: { width: 42, alignItems: 'center' },
  timelineDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, zIndex: 2 },
  timelineLine: { position: 'absolute', top: 30, bottom: -8, width: 1, backgroundColor: '#EAECF0' },
  cardBody: { flex: 1, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, backgroundColor: '#FFFFFF', shadowColor: '#101828', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  highlightedCard: { backgroundColor: '#FFFBFA', borderWidth: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  authorBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 11, fontWeight: '900' },
  authorCopy: { flexShrink: 1 },
  author: { fontSize: 12, fontWeight: '900', color: '#101828' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
  source: { fontSize: 9, fontWeight: '700', color: '#667085', flexShrink: 1 },
  sentimentBadge: { height: 26, paddingHorizontal: 9, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sentimentDot: { width: 6, height: 6, borderRadius: 3 },
  sentimentText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewText: { marginTop: 12, fontSize: 12, lineHeight: 19, color: '#344054', flexShrink: 1 },
  translationBubble: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#B2DDFF', backgroundColor: '#EFF8FF' },
  translationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  translationTitle: { fontSize: 9, fontWeight: '900', color: '#175CD3', textTransform: 'uppercase', letterSpacing: 0.4 },
  languageTag: { marginLeft: 'auto', fontSize: 8, fontWeight: '800', color: '#667085' },
  translationText: { marginTop: 5, fontSize: 12, lineHeight: 18, color: '#1849A9' },
  translationInfo: { marginTop: 7, fontSize: 9, color: '#667085' },
  translationError: { marginTop: 7, fontSize: 10, lineHeight: 15, color: '#B42318' },
  cardFooter: { marginTop: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#F2F4F7', flexDirection: 'row', alignItems: 'center' },
  ratingRow: { flexDirection: 'row', gap: 1 },
  ratingValue: { marginLeft: 7, fontSize: 10, fontWeight: '900', color: '#344054' },
  verified: { marginLeft: 'auto', fontSize: 9, fontWeight: '700', color: '#98A2B3' },
  translateButton: { alignSelf: 'flex-start', minHeight: 30, marginTop: 8, paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, borderColor: '#B2DDFF', backgroundColor: '#F5FAFF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  translateButtonPressed: { opacity: 0.75 },
  translateButtonText: { fontSize: 9, fontWeight: '800', color: '#175CD3' },
});
