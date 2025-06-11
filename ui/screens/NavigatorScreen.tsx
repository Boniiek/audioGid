import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

function NavigatorScreen(): React.JSX.Element {

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.textContainer}>
        <Text style={styles.textStyle}>В разработке</Text>
      </View>
      <View style={styles.textContainer2}>
        <Text style={styles.textStyle}>Связаться с нами:</Text>
        <Text style={styles.textStyle2}>Касьянов Никита (Product Owner)</Text>
        <Text style={styles.textStyle2}>Телефон: +79081728389</Text>
        <Text style={styles.textStyle2}>Почта: kasyanovn317@gmail.com</Text>
        <Text style={styles.textStyle2}>Телеграм: @nnikit0nn</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    fontSize: 26,
    color: 'black',
  },
  textStyle2: {
    fontSize: 20,
    color: 'gray',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    position: 'absolute',
    zIndex: 1,
    top: 20,
    left: 20,
  },
  textContainer2: {
    // position: 'absolute',
    flex: 1,
    zIndex: 1,
    top: 20,
    left: 20,
    justifyContent: 'center',
  },
});

export default NavigatorScreen;
