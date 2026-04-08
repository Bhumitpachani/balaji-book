import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { firebaseService, CreateClientData, Client } from "@/lib/firebaseService";
import { INDIA_STATES_AND_UTS, getCitiesForState } from "@/lib/indiaLocations";
import { INDUSTRY_FIELDS } from "@/lib/industryFields";
import { useToast } from "@/hooks/use-toast";
import { CityCombobox } from "@/components/common/CityCombobox";
import { StateCombobox } from "@/components/common/StateCombobox";
import { FieldCombobox } from "@/components/common/FieldCombobox";

export const CreateClient: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const prevStateRef = useRef<string | null>(null);
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: '',
    field: '',
    clientType: ''
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await firebaseService.getAllClients();
        setClients(data);
      } catch (error) {
        console.error('Failed to load clients for state/city options:', error);
      }
    };
    loadClients();
  }, []);

  const availableStates = useMemo(() => {
    const unique = new Set(INDIA_STATES_AND_UTS);
    if (formData.state?.trim() && !unique.has(formData.state.trim())) {
      unique.add(formData.state.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [formData.state]);

  const availableFields = useMemo(() => {
    const unique = new Set(INDUSTRY_FIELDS);
    if (formData.field?.trim() && !unique.has(formData.field.trim())) {
      unique.add(formData.field.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [formData.field]);

  const availableCities = useMemo(() => {
    const selectedState = formData.state?.trim() || '';
    const baseCities = getCitiesForState(selectedState);
    const clientCities = clients
      .filter(client => {
        if (!selectedState) return true;
        return (client.state || '').trim().toLowerCase() === selectedState.toLowerCase();
      })
      .map(client => client.city?.trim())
      .filter((value): value is string => Boolean(value));
    const unique = new Set([...baseCities, ...clientCities]);
    if (formData.city?.trim()) {
      unique.add(formData.city.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [clients, formData.state, formData.city]);

  useEffect(() => {
    if (prevStateRef.current === null) {
      prevStateRef.current = formData.state || '';
      return;
    }

    if (prevStateRef.current !== (formData.state || '')) {
      setFormData(prev => ({ ...prev, city: '' }));
      prevStateRef.current = formData.state || '';
    }
  }, [formData.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.mobileNumber) {
      toast({
        title: "Error",
        description: "Name and mobile number are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await firebaseService.createClient(formData);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      navigate('/clients');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link to="/clients">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Add New Client</h1>
        </div>
      </header>

      <div className="p-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter client name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number *</Label>
                <Input
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="Enter mobile number"
                  type="tel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <CityCombobox
                    id="city"
                    value={formData.city}
                    options={availableCities}
                    onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    placeholder={formData.state ? "Select city" : "Select state first"}
                    disabled={!formData.state}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <StateCombobox
                    id="state"
                    value={formData.state || ''}
                    options={availableStates}
                    onChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                    placeholder="Select state"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field">Field</Label>
                  <FieldCombobox
                    id="field"
                    value={formData.field || ''}
                    options={availableFields}
                    onChange={(value) => setFormData(prev => ({ ...prev, field: value }))}
                    placeholder="Select field"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.clientType || undefined}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="B2C">B2C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Client'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
