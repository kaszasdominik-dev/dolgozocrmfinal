import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8001/api";

export default function UnsubscribePage() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading, confirming, success, error
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const res = await axios.post(`${API}/leiratkozas/${token}`);
      setEmail(res.data.email || "");
      setStatus("success");
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba történt a leiratkozás során");
      setStatus("error");
    }
  };

  useEffect(() => {
    // Auto-show confirmation
    setStatus("confirming");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="w-16 h-16 text-primary animate-spin" />}
            {status === "confirming" && <Mail className="w-16 h-16 text-primary" />}
            {status === "success" && <CheckCircle className="w-16 h-16 text-green-500" />}
            {status === "error" && <XCircle className="w-16 h-16 text-red-500" />}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Feldolgozás..."}
            {status === "confirming" && "Email leiratkozás"}
            {status === "success" && "Sikeresen leiratkozott!"}
            {status === "error" && "Hiba történt"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "confirming" && (
            <>
              <CardDescription className="text-base">
                Biztosan le szeretne iratkozni az email értesítésekről?
              </CardDescription>
              <CardDescription>
                A leiratkozás után nem kap több állásajánlatot emailben.
              </CardDescription>
              <div className="flex gap-3 justify-center mt-6">
                <Button variant="outline" onClick={() => window.close()}>
                  Mégsem
                </Button>
                <Button onClick={handleUnsubscribe}>
                  Leiratkozás
                </Button>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CardDescription className="text-base">
                {email ? (
                  <>Az <strong>{email}</strong> email cím törlésre került a levelezőlistánkról.</>
                ) : (
                  <>Az email címe törlésre került a levelezőlistánkról.</>
                )}
              </CardDescription>
              <CardDescription>
                Többé nem kap tőlünk állásajánlatot emailben.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <CardDescription className="text-base text-red-600 dark:text-red-400">
                {error}
              </CardDescription>
              <CardDescription>
                Kérjük próbálja újra később, vagy lépjen kapcsolatba velünk.
              </CardDescription>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
