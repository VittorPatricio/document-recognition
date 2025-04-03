# document-recognition

cd android && ./gradlew clean && cd .. && npx react-native run-android --verbose

---

cd android && ./gradlew clean
rm -rf android/.gradle android/.idea android/app/build android/build
rm -rf package-lock.json bun.lockb node_modules
cd ..
npm i

---

npm start -- --reset-cache
npx react-native run-android --verbose
