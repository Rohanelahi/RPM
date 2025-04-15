const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'http://150.230.244.231:5000'  // Your OCI server IP
    : 'http://localhost:5000'
};

export default config; 