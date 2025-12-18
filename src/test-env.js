// Quick test to check environment variables
console.log('=== ENVIRONMENT VARIABLE TEST ===');
console.log('REACT_APP_ENABLE_TEST_MODE:', process.env.REACT_APP_ENABLE_TEST_MODE);
console.log('Type:', typeof process.env.REACT_APP_ENABLE_TEST_MODE);
console.log('Is true?:', process.env.REACT_APP_ENABLE_TEST_MODE === 'true');
console.log('Is false?:', process.env.REACT_APP_ENABLE_TEST_MODE === 'false');
console.log('All env vars starting with REACT_APP:');
Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP'))
  .forEach(key => {
    console.log(`  ${key}: ${process.env[key]}`);
  });
