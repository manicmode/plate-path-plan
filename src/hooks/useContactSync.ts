import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
}

interface HashedContact {
  name: string;
  hash: string;
  type: 'phone' | 'email';
  originalValue: string;
}

interface Friend {
  userId: string;
  email?: string;
  phone?: string;
  name: string;
}

export const useContactSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [nonFriends, setNonFriends] = useState<Contact[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Hash function using Web Crypto API
  const hashValue = async (value: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Request contact permission and access contacts
  const requestContactPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check if we're in a supported environment
      if (!('contacts' in navigator) || !('ContactsManager' in window)) {
        toast({
          title: "Contacts not supported",
          description: "Contact sync is not supported on this device/browser.",
          variant: "destructive"
        });
        return false;
      }

      // Request permission
      const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], {
        multiple: true
      });

      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Contact permission error:', error);
      setHasPermission(false);
      toast({
        title: "Permission denied",
        description: "Contact access was denied. You can enable it in browser settings.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Get and process contacts
  const getContacts = useCallback(async (): Promise<Contact[]> => {
    try {
      if (!('contacts' in navigator)) {
        throw new Error('Contacts API not supported');
      }

      const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], {
        multiple: true
      });

      return contacts.map((contact: any) => ({
        name: contact.name?.[0] || 'Unknown',
        phoneNumbers: contact.tel || [],
        emails: contact.email || []
      }));
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }, []);

  // Hash contacts and upload to Supabase
  const syncContacts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const contacts = await getContacts();
      const hashedContacts: HashedContact[] = [];

      // Hash all contact information
      for (const contact of contacts) {
        // Hash phone numbers
        if (contact.phoneNumbers) {
          for (const phone of contact.phoneNumbers) {
            const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
            if (cleanPhone.length >= 10) {
              const hash = await hashValue(cleanPhone);
              hashedContacts.push({
                name: contact.name,
                hash,
                type: 'phone',
                originalValue: cleanPhone
              });
            }
          }
        }

        // Hash emails
        if (contact.emails) {
          for (const email of contact.emails) {
            if (email.includes('@')) {
              const hash = await hashValue(email);
              hashedContacts.push({
                name: contact.name,
                hash,
                type: 'email',
                originalValue: email
              });
            }
          }
        }
      }

      // Upload hashed contacts to Supabase
      const contactsToInsert = hashedContacts.map(contact => ({
        user_id: user.id,
        contact_hash: contact.hash,
        contact_name: contact.name,
        contact_type: contact.type
      }));

      // Insert with conflict resolution (upsert)
      const { error: insertError } = await supabase
        .from('user_contacts')
        .upsert(contactsToInsert, { 
          onConflict: 'user_id,contact_hash',
          ignoreDuplicates: true 
        });

      if (insertError) throw insertError;

      // Find friends using the database function
      const hashes = hashedContacts.map(c => c.hash);
      const { data: friendMatches, error: friendError } = await supabase
        .rpc('find_user_friends', { contact_hashes: hashes });

      if (friendError) throw friendError;

      // Process results
      const foundFriends: Friend[] = [];
      const foundFriendHashes = new Set();

      friendMatches?.forEach((match: any) => {
        foundFriendHashes.add(match.contact_hash);
        const originalContact = hashedContacts.find(c => c.hash === match.contact_hash);
        if (originalContact && match.user_id !== user.id) {
          foundFriends.push({
            userId: match.user_id,
            email: match.email,
            phone: match.phone,
            name: originalContact.name
          });
        }
      });

      // Separate friends and non-friends
      const nonFriendContacts = contacts.filter(contact => {
        const hasMatch = hashedContacts.some(hashed => 
          hashed.name === contact.name && foundFriendHashes.has(hashed.hash)
        );
        return !hasMatch;
      });

      setFriends(foundFriends);
      setNonFriends(nonFriendContacts);

      toast({
        title: "Contacts synced",
        description: `Found ${foundFriends.length} friends on VOYAGE!`
      });

    } catch (error) {
      console.error('Contact sync error:', error);
      toast({
        title: "Sync failed",
        description: "Unable to sync contacts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, getContacts, toast]);

  // Invite contact via SMS/Email
  const inviteContact = useCallback((contact: Contact) => {
    const message = "Hey! I'm using VOYAGE to track my nutrition and stay healthy. You should check it out!";
    
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phone = contact.phoneNumbers[0].replace(/\D/g, '');
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`);
    } else if (contact.emails && contact.emails.length > 0) {
      const email = contact.emails[0];
      window.open(`mailto:${email}?subject=Join me on VOYAGE&body=${encodeURIComponent(message)}`);
    }
  }, []);

  return {
    isLoading,
    hasPermission,
    friends,
    nonFriends,
    requestContactPermission,
    syncContacts,
    inviteContact
  };
};