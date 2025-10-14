import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  showNumber?: boolean;
  color?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 24,
  readonly = false,
  showNumber = false,
  color = '#FFD700',
}) => {
  const handlePress = (selectedRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          const isHalf = !isFilled && star - 0.5 <= rating;

          if (readonly) {
            return (
              <View key={star} style={[styles.star, { width: size, height: size }]}>
                <Ionicons
                  name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                  size={size}
                  color={isFilled || isHalf ? color : '#D1D5DB'}
                />
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={star}
              onPress={() => handlePress(star)}
              style={[styles.star, { width: size + 8, height: size + 8 }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={size}
                color={isFilled ? color : '#D1D5DB'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {showNumber && (
        <Text style={styles.ratingText}>
          {rating > 0 ? rating.toFixed(1) : '0.0'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
});

export default StarRating;


