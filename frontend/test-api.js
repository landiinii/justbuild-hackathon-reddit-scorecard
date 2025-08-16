#!/usr/bin/env node

/**
 * Simple API test script for Mastra backend
 * Run this to verify your backend endpoints are working
 */

const API_BASE = 'http://localhost:4111';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`\n🔍 Testing ${method} ${endpoint}...`);
    const response = await fetch(url, options);
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      try {
        const data = await response.json();
        console.log(`   ✅ Success:`, JSON.stringify(data, null, 2));
        return true;
      } catch (parseError) {
        const text = await response.text();
        console.log(`   ✅ Success (text):`, text.substring(0, 200));
        return true;
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Failed:`, errorText);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Mastra Backend API Endpoints');
  console.log('=====================================');
  console.log(`Base URL: ${API_BASE}\n`);

  const results = [];

  // Test basic connectivity
  results.push(await testEndpoint('/'));
  
  // Test agents endpoint
  results.push(await testEndpoint('/api/agents'));
  
  // Test workflows endpoint
  results.push(await testEndpoint('/api/workflows'));
  
  // Test brand discovery agent
  results.push(await testEndpoint('/api/agents/brandDiscoveryAgent/generate', 'POST', {
    messages: [
      {
        role: 'user',
        content: 'Research the brand "Tesla" (electric vehicle company)'
      }
    ],
    maxSteps: 5
  }));

  // Summary
  console.log('\n📊 Test Results');
  console.log('===============');
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your backend is ready.');
  } else {
    console.log('⚠️  Some tests failed. Check your backend configuration.');
  }
}

// Run tests
runTests().catch(console.error);
