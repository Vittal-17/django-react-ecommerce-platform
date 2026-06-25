from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to only allow owners of a review to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in SAFE_METHODS:
            return True

        # Write permissions only for the owner of the object
        return obj.user == request.user

from rest_framework import permissions

class IsAdminOrOwner(permissions.BasePermission):
    """
    Custom permission to only allow admins or the owner of an object to delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Allow admins to delete any review
        if request.user.is_staff:
            return True
        # Allow owners to delete their own reviews
        return obj.user == request.user
    
from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Allow if admin
        if request.user.is_staff or request.user.role == 'admin':
            return True
        # Allow if the user is updating their own data
        return obj == request.user or request.user.is_staff