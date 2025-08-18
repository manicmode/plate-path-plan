import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Synonym {
  id?: number;
  term: string;
  synonym: string;
  weight: number;
}

export default function SynonymsPage() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Synonym>>({});
  const { toast } = useToast();

  const filteredSynonyms = synonyms.filter(
    syn => 
      syn.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      syn.synonym.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadSynonyms = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-synonyms', {
        method: 'GET'
      });
      
      if (error) throw error;
      if (data?.ok && data?.data) {
        setSynonyms(data.data);
      }
    } catch (error) {
      console.error('Error loading synonyms:', error);
      toast({
        title: "Error",
        description: "Failed to load synonyms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSynonym = async (synonym: Synonym) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-synonyms/upsert', {
        method: 'POST',
        body: synonym
      });
      
      if (error) throw error;
      if (data?.ok) {
        toast({
          title: "Success",
          description: "Synonym saved successfully"
        });
        loadSynonyms();
        setEditingId(null);
        setEditData({});
      }
    } catch (error) {
      console.error('Error saving synonym:', error);
      toast({
        title: "Error",
        description: "Failed to save synonym",
        variant: "destructive"
      });
    }
  };

  const deleteSynonym = async (id: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-synonyms/delete', {
        method: 'POST',
        body: { id }
      });
      
      if (error) throw error;
      if (data?.ok) {
        toast({
          title: "Success",
          description: "Synonym deleted successfully"
        });
        loadSynonyms();
      }
    } catch (error) {
      console.error('Error deleting synonym:', error);
      toast({
        title: "Error",
        description: "Failed to delete synonym",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (synonym: Synonym) => {
    setEditingId(synonym.id || null);
    setEditData(synonym);
  };

  const handleSave = () => {
    if (!editData.term || !editData.synonym) {
      toast({
        title: "Error",
        description: "Term and synonym are required",
        variant: "destructive"
      });
      return;
    }
    
    saveSynonym({
      id: editingId || undefined,
      term: editData.term,
      synonym: editData.synonym,
      weight: editData.weight || 0.3
    });
  };

  const handleAddNew = () => {
    setEditingId(-1); // Use -1 for new items
    setEditData({ term: '', synonym: '', weight: 0.3 });
  };

  useEffect(() => {
    loadSynonyms();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Habit Search Synonyms</CardTitle>
          <CardDescription>
            Manage search synonyms for habit discovery and matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search synonyms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={handleAddNew} data-testid="syn-new">
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Synonym</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingId === -1 && (
                  <TableRow data-testid="syn-row">
                    <TableCell>
                      <Input
                        value={editData.term || ''}
                        onChange={(e) => setEditData({ ...editData, term: e.target.value })}
                        placeholder="Enter term"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editData.synonym || ''}
                        onChange={(e) => setEditData({ ...editData, synonym: e.target.value })}
                        placeholder="Enter synonym"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={editData.weight || 0.3}
                        onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) || 0.3 })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={handleSave} data-testid="syn-save">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditingId(null);
                            setEditData({});
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                {filteredSynonyms.map((synonym) => (
                  <TableRow key={synonym.id} data-testid="syn-row">
                    <TableCell>
                      {editingId === synonym.id ? (
                        <Input
                          value={editData.term || ''}
                          onChange={(e) => setEditData({ ...editData, term: e.target.value })}
                        />
                      ) : (
                        synonym.term
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === synonym.id ? (
                        <Input
                          value={editData.synonym || ''}
                          onChange={(e) => setEditData({ ...editData, synonym: e.target.value })}
                        />
                      ) : (
                        synonym.synonym
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === synonym.id ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editData.weight || 0.3}
                          onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) || 0.3 })}
                        />
                      ) : (
                        synonym.weight
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === synonym.id ? (
                          <>
                            <Button size="sm" onClick={handleSave} data-testid="syn-save">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingId(null);
                                setEditData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(synonym)}>
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => synonym.id && deleteSynonym(synonym.id)}
                              data-testid="syn-delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}