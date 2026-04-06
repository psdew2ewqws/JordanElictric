import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, TextStyle, StyleProp } from 'react-native';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  style?: StyleProp<TextStyle>;
}

export function AnimatedCounter({ value, duration = 1200, decimals = 0, suffix = '', prefix = '', style }: Props) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const formatValue = (v: number) => prefix + (decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()) + suffix;
  const [display, setDisplay] = React.useState(formatValue(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(formatValue(value));
      return;
    }

    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animVal.addListener(({ value: v }) => {
      setDisplay(formatValue(v));
    });

    return () => animVal.removeAllListeners();
  }, [value, reduceMotion]);

  return <Text style={style} accessibilityLiveRegion="polite">{display}</Text>;
}
