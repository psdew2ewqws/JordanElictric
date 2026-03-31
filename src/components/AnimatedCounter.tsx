import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle } from 'react-native';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  style?: TextStyle;
}

export function AnimatedCounter({ value, duration = 1200, decimals = 0, suffix = '', prefix = '', style }: Props) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(prefix + '0' + suffix);

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animVal.addListener(({ value: v }) => {
      setDisplay(prefix + (decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()) + suffix);
    });

    return () => animVal.removeListener(listener);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}
