const axios = require('axios');

async function testApi() {
    try {
        console.log('Obtaining token...');
        const tokenResponse = await axios.post('https://t4e-testserver.onrender.com/api/public/token', {
            studentId: 'SANDEEP SRINIVASAN S',
            password: '203264'
        });
        console.log('Token Response:', tokenResponse.data);
        
        const { token, dataUrl } = tokenResponse.data;
        const fetchUrl = dataUrl.startsWith('http') ? dataUrl : `https://t4e-testserver.onrender.com/api${dataUrl}`;
        console.log('Fetching dataset from:', fetchUrl);
        
        const dataResponse = await axios.get(fetchUrl, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        const data = dataResponse.data.data || dataResponse.data;
        const keys = Object.keys(data);
        console.log('Dataset keys:', keys);
        for (const key of keys) {
            if (Array.isArray(data[key])) {
                console.log(`- ${key}: ${data[key].length} items. First item sample:`, data[key][0]);
            } else {
                console.log(`- ${key}:`, typeof data[key]);
            }
        }
    } catch (error) {
        console.error('Error fetching API:', error.response?.data || error.message);
    }
}

testApi();
