import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Rect, Line, Circle} from 'react-native-svg';

export default function IDCardIllustration() {
  return (
    <View style={styles.container}>
      <Svg width={280} height={176} viewBox="0 0 280 176" fill="none">
        <Rect
          x={2}
          y={2}
          width={276}
          height={172}
          rx={12}
          fill="#F5F3FF"
          stroke="#4535B0"
          strokeWidth={2}
        />

        <Rect x={24} y={28} width={72} height={88} rx={6} fill="#E6E1FF" />
        <Circle cx={60} cy={62} r={14} fill="#C8BFFF" />
        <Rect x={32} y={88} width={56} height={20} rx={4} fill="#C8BFFF" />

        <Rect x={112} y={32} width={140} height={10} rx={3} fill="#C8BFFF" />
        <Rect x={112} y={52} width={108} height={8} rx={3} fill="#D9D2FF" />
        <Rect x={112} y={70} width={132} height={8} rx={3} fill="#D9D2FF" />
        <Rect x={112} y={88} width={96} height={8} rx={3} fill="#D9D2FF" />

        <Line
          x1={24}
          y1={138}
          x2={256}
          y2={138}
          stroke="#4535B0"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Rect x={24} y={146} width={232} height={10} rx={2} fill="#D9D2FF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
});
