'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import { User, Mail, Phone, MapPin, Book, Award, Calendar, Save, Edit3 } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const handleSave = () => {
    updateUser(formData);
    setIsEditing(false);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-gray-400">Manage your personal information and settings</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          className={isEditing ? "border-gray-600 text-gray-300" : "bg-blue-600 hover:bg-blue-700"}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-4xl">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-blue-400 font-mono">{user.studentId}</p>
              <Badge variant="secondary" className="mt-2">
                {user.role}
              </Badge>
            </div>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Upload Photo
            </Button>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Personal Information</CardTitle>
              {isEditing && (
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium">First Name</label>
                  {isEditing ? (
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="mt-1 bg-gray-700 border-gray-600 text-white"
                    />
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{user.firstName}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium">Last Name</label>
                  {isEditing ? (
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="mt-1 bg-gray-700 border-gray-600 text-white"
                    />
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{user.lastName}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-gray-300 text-sm font-medium">Email</label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-white">{user.email}</span>
                  <Badge variant="outline" className="border-gray-600 text-gray-400">
                    Verified
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium">Phone</label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{user.phone || 'Not provided'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium">Address</label>
                {isEditing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Enter address"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{user.address || 'Not provided'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium">Bio</label>
                {isEditing ? (
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell us about yourself"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                ) : (
                  <div className="mt-1">
                    <p className="text-white bg-gray-700 p-3 rounded-lg">
                      {user.bio || 'No bio provided'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium">Student ID</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-500 text-blue-400">
                      {user.studentId}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium">Program</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Book className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{user.program}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium">Current Semester</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-white">Semester {user.semester}</span>
                  </div>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium">CGPA</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span className="text-emerald-400 font-bold">{user.cgpa.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}