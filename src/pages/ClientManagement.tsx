import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Edit, Trash2, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { firebaseService, Client } from "@/lib/firebaseService";
import { MobileNavigation } from "@/components/common/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCitiesForState } from "@/lib/indiaLocations";
import { CityCombobox } from "@/components/common/CityCombobox";
import { FieldCombobox } from "@/components/common/FieldCombobox";
import { INDUSTRY_FIELDS } from "@/lib/industryFields";

export const ClientManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await firebaseService.getAllClients();
      setClients(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      await firebaseService.deleteClient(clientId);
      setClients(clients.filter(client => client.id !== clientId));
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const availableStates = useMemo(() => {
    const unique = new Set(
      clients
        .map(client => client.state?.trim())
        .filter((value): value is string => Boolean(value))
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const availableCities = useMemo(() => {
    const selectedState = stateFilter === 'all' ? '' : stateFilter.trim().toLowerCase();
    const baseCities = selectedState ? getCitiesForState(stateFilter) : [];
    const clientCities = clients
      .filter(client => {
        if (!selectedState) return true;
        return (client.state || '').trim().toLowerCase() === selectedState;
      })
      .map(client => client.city?.trim())
      .filter((value): value is string => Boolean(value));
    const unique = new Set([...baseCities, ...clientCities]);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [clients, stateFilter]);

  const availableFields = useMemo(() => {
    const unique = new Set(INDUSTRY_FIELDS);
    if (fieldFilter?.trim()) {
      unique.add(fieldFilter.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [fieldFilter]);

  useEffect(() => {
    if (!cityFilter.trim()) return;
    const normalized = cityFilter.trim().toLowerCase();
    const matches = availableCities.some(city => city.toLowerCase().includes(normalized));
    if (!matches) {
      setCityFilter('');
    }
  }, [stateFilter, availableCities, cityFilter]);

  const filteredClients = clients.filter(client => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search || [
      client.name,
      client.mobileNumber,
      client.address,
      client.city,
      client.state,
      client.field,
      client.clientType
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(search));

    const matchesCity = !cityFilter.trim() ||
      (client.city || '').toLowerCase().includes(cityFilter.trim().toLowerCase());
    const matchesState = stateFilter === 'all' ||
      (client.state || '').trim().toLowerCase() === stateFilter.trim().toLowerCase();
    const matchesField = !fieldFilter.trim() ||
      (client.field || '').toLowerCase().includes(fieldFilter.trim().toLowerCase());
    const matchesType = typeFilter === 'all' ||
      (client.clientType || '').toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesCity && matchesState && matchesField && matchesType;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          {user?.role === 'admin' && (
            <Button asChild size="sm" className="bg-primary hover:bg-primary-hover">
              <Link to="/clients/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Search */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, mobile, city, state, field, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {availableStates.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CityCombobox
                id="cityFilter"
                value={cityFilter}
                options={availableCities}
                onChange={setCityFilter}
                placeholder="Filter by city"
                allowAll
                allLabel="All cities"
              />
              <FieldCombobox
                id="fieldFilter"
                value={fieldFilter}
                options={availableFields}
                onChange={setFieldFilter}
                placeholder="Filter by field"
                allowAll
                allLabel="All fields"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                  <SelectItem value="B2C">B2C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="space-y-3">
          {filteredClients.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No clients found</p>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card key={client.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{client.mobileNumber}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Client
                      </Badge>
                    </div>

                    {/* Address */}
                    {(client.address || client.city || client.state) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          {client.address && <p className="text-foreground">{client.address}</p>}
                          <p className="text-muted-foreground">
                            {[client.city, client.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {(client.field || client.clientType) && (
                      <div className="flex flex-wrap gap-2">
                        {client.clientType && (
                          <Badge variant="secondary" className="text-xs">
                            {client.clientType}
                          </Badge>
                        )}
                        {client.field && (
                          <Badge variant="outline" className="text-xs">
                            {client.field}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="px-3">
                          <Link to={`/clients/${client.id}/orders`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Orders
                          </Link>
                        </Button>
                      </div>

                      {user?.role === 'admin' && (
                        <div className="flex gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Link to={`/clients/${client.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(client.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};
