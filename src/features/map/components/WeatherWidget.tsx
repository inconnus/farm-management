import { Column, Row } from '@app/layout';
import { DropletsIcon, SunIcon, ThermometerIcon, WindIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const WeatherWidget = () => {
  const [data, setData] = useState({
    solarIrradiance: 900,
    temperature: 32,
    humidity: 54,
    windSpeed: 2,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData({
        solarIrradiance: Math.floor(Math.random() * (950 - 700 + 1)) + 700,
        temperature: Math.floor(Math.random() * (36 - 28 + 1)) + 28,
        humidity: Math.floor(Math.random() * (75 - 45 + 1)) + 45,
        windSpeed: Math.floor(Math.random() * (12 - 2 + 1)) + 2,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Column className="absolute w-32 top-3 right-3 z-20 p-3 rounded-3xl backdrop-blur-sm border border-gray-200/20 gap-2 text-sm">
      <Row className="items-center gap-2">
        <SunIcon color="#f4b124" size={22} />
        <span className="text-white">{data.solarIrradiance} W/m²</span>
      </Row>
      <Row className="items-center gap-2">
        <ThermometerIcon color="#f93748" size={22} />
        <span className="text-white">{data.temperature} °C</span>
      </Row>
      <Row className="items-center gap-2">
        <DropletsIcon color="#40b0fb" size={22} />
        <span className="text-white">{data.humidity} %</span>
      </Row>
      <Row className="items-center gap-2">
        <WindIcon color="white" size={22} />
        <span className="text-white">{data.windSpeed} m/s</span>
      </Row>
    </Column>
  );
};

export default WeatherWidget;
