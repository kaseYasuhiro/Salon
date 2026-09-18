import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Dashboard from './dashboard';
import Appointments from './Appointments';
import Services from './Services';
import Employees from './Employees';
import Inventory from './Inventory';
import Reports from './Reports';
import Products from './Products';
import Sales from './Sales';
import AppointmentDetails from './AppointmentDetails';
import InventoryReports from './InventoryReports';
import Remittances from './Remittances';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(

    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<Dashboard />}>
          {/* Nested routes */}
          <Route path="appointments" element={<Appointments />} />
          <Route path="appointments/list" element={<AppointmentDetails />} />
          <Route path="appointments/:id" element={<AppointmentDetails />} />
          <Route path="services" element={<Services />} />
          <Route path="employees" element={<Employees />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="products" element={<Products />} />
          <Route path="sales" element={<Sales />} />
          <Route path="inventoryReports" element={<InventoryReports />} />
          <Route path="remittances" element={<Remittances />} />
        </Route>
      </Routes>
    </BrowserRouter>

);