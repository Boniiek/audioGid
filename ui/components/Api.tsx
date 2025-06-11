import axios from 'axios';

const API_URL = 'http://109.172.31.90:8080/api';

export const register = async (email: string, username: string, password: string) => {
  const response = await axios.post(`${API_URL}/register`, {
    email: email,
    username: username,
    password: password,
  });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/login`, {
    email: email,
    password: password,
  });
  return response.data;
};