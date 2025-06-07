import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import "./assets/style.css"
import { AuthProvider } from "./hooks/useAuth.jsx"
import Login from "./pages/Login"
import Landing from "./pages/Landing"
import Calculator from "./pages/Calculator"

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/calculator" element={<Calculator />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
