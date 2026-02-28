import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>

          {/* 404 Text */}
          <h1 className="mb-2 text-7xl md:text-8xl font-bold text-primary">404</h1>
          
          <h2 className="mb-4 text-2xl md:text-3xl font-semibold text-foreground">
            Page Not Found
          </h2>
          
          <p className="mb-8 text-muted-foreground">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button className="w-full sm:w-auto gap-2">
                <Home className="h-4 w-4" />
                Go to Homepage
              </Button>
            </Link>
            <Link to="/feed">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Search className="h-4 w-4" />
                Browse News
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;

