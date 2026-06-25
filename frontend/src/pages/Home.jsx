import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../components/Home/Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="content-wrapper">
        <div className="space-y-8">
          <h1 className="hero-heading text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-900">
            Welcome to Our eCommerce Platform
          </h1>
          
          <p className="subtitle text-gray-800">
            Discover curated collections and experience effortless shopping 
            with our seamless platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;