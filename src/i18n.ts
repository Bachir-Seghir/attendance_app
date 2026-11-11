
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  fr: {
    translation: {
      app: {
        title: "Plateforme de Pointage du Personnel SOMIK - CP1Z",
            logout: "Déconnexion",
            developedBy: "Développée par",
            
          },
          login: {
              loginTitle: "Plateforme de Pointage SOMIK",
              info: "Connecter pour acceder à votre compte"
        },
      common: {
        save: "Enregistrer",
        cancel: "Annuler",
        edit: "Modifier",
        delete: "Supprimer",
        search: "Rechercher",
        loading: "Chargement...",
        yes: "Oui",
          no: "Non",
        roles: {
          SUPER_ADMIN: "Administrateur",
  MANAGER: "Manageur",
  ATTENDANCE_OFFICER: "Résponsable Directe",
  VISITOR: "Visiteur"
          },
      },
      attendance: {
        title: "Pointage mensuel",
        employee: "Employé",
        department: "Département",
        normalHours: "Heures normales",
        overtimeHours: "Heures supplémentaires",
        totalHours: "Total des heures",
        crBalance: "Solde CR",
        save: "Enregistrer le pointage",
      },
      navigation: {
        dashboard: "Tableau de bord",
        employees: "Employés",
        users: "Utilisateurs",
        departments: "Départements",
      },
      auth: {
        identifier: "Identifiant",
        password: "Mot de passe",
          login: "Se connecter",
        loginIn:"Connexion..."
      },
          
          toolBar: {
            month: "Mois",
            year: "Année",
              department: "Affectation",
              NH: "Heures Normales",
              OT: "Heures Sup.",
              totals: "Total des Heures",
              totalEmployees: "Personnel Total",
            allDepartment:"Toutes les Structures"
          },
          
tools: {
  loading: "Chargement...",
  loadingEmployeesError: "Échec du chargement des employés.",
  exportError: "Échec de l'exportation du pointage.",
  noChangesToSave: "Aucune modification à enregistrer.",
  savingInProgress: "Veuillez patienter jusqu'à la fin de l'enregistrement du pointage.",
  saveBeforeChangingMonth: "Veuillez enregistrer vos modifications avant de changer de mois.",
  saveBeforeChangingYear: "Veuillez enregistrer vos modifications avant de changer d'année.",
  saveBeforeChangingDepartment: "Veuillez enregistrer vos modifications avant de changer de département.",
  attendanceSaved: "Pointage enregistré avec succès !",
  saveError: "Échec de l'enregistrement du pointage. Veuillez réessayer.",
  exportExcel: "Exporter Excel"
},

manageUsers: {
  button: "Gérer les utilisateurs",
  title: "Gestion des utilisateurs",
  description: "Gérer les comptes et les autorisations de l'application.",
  addUser: "Ajouter un utilisateur",
  close: "Fermer",
  searchPlaceholder: "Rechercher par nom ou e-mail...",
  showInactive: "Afficher les utilisateurs inactifs",
  loading: "Chargement des utilisateurs...",
  name: "Nom",
  email: "E-mail",
  role: "Rôle",
  department: "Département",
  status: "Statut",
  actions: "Actions",
  active: "Actif",
  inactive: "Inactif",
  edit: "Modifier",
  password: "Mot de passe",
  activate: "Activer",
  deactivate: "Désactiver",
  noUsersCreated: "Aucun utilisateur n'a encore été créé.",
  noUsersFound: "Aucun utilisateur trouvé.",
  editUser: "Modifier l'utilisateur",
  addUserTitle: "Ajouter un utilisateur",
  fullName: "Nom complet",
  initialPassword: "Mot de passe initial",
  selectDepartment: "Sélectionner un département",
  cancel: "Annuler",
  saving: "Enregistrement...",
  saveUser: "Enregistrer l'utilisateur",
  resetPassword: "Réinitialiser le mot de passe",
  newPasswordPlaceholder: "Nouveau mot de passe (8 caractères minimum)",
  resetting: "Réinitialisation...",
  resetPasswordButton: "Réinitialiser le mot de passe",
  passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
  assignDepartment: "Veuillez affecter un département à cet agent de pointage.",
  userCreated: "Utilisateur créé avec succès.",
  userUpdated: "Utilisateur modifié avec succès.",
  userActivated: "Utilisateur activé avec succès.",
  userDeactivated: "Utilisateur désactivé avec succès.",
  passwordResetSuccess: "Mot de passe réinitialisé avec succès.",
  loadError: "Échec du chargement des utilisateurs.",
  saveError: "Échec de l'enregistrement de l'utilisateur.",
  updateError: "Échec de la mise à jour de l'utilisateur.",
  resetPasswordError: "Échec de la réinitialisation du mot de passe.",
  confirmStatusChange: "Êtes-vous sûr de vouloir {{action}} l'utilisateur {{name}} ?",
  
  actionsLabels: {
    activate: "activer",
    deactivate: "désactiver"
  }
},

    },
  },

  en: {
    translation: {
      app: {
        title: "Attendance Management System for SOMIK - CP1Z",
            logout: "Logout",
            developedBy: "Developed By",
        
          },
        login: {
              loginTitle: "Attendance Management SOMIK",
              info: "Sign in to access your account"
          },
          toolBar: {
            month: "Month",
            year: "Year",
              department: "Department",
              NH: "Normal Hours",
              OT: "OverTime",
              totals: "Total Hours",
              totalEmployees: "Total Employees",
              allDepartment:"All Department"
        },
      common: {
        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        search: "Search",
        loading: "Loading...",
        yes: "Yes",
          no: "No",
        roles: {
          SUPER_ADMIN: "Administrator",
  MANAGER: "Manager",
  ATTENDANCE_OFFICER: "Attendance Officier",
  VISITOR: "Visitor"
          },
      },
      attendance: {
        title: "Monthly Attendance",
        employee: "Employee",
        department: "Department",
        normalHours: "Normal Hours",
        overtimeHours: "Overtime Hours",
        totalHours: "Total Hours",
        crBalance: "CR Balance",
        save: "Save Attendance",
      },
      navigation: {
        dashboard: "Dashboard",
        employees: "Employees",
        users: "Users",
        departments: "Departments",
      },
      auth: {
        identifier: "Identifier",
        password: "Password",
          login: "Login",
        loginIn:"Signing in..."
          },
      
      
tools: {
  loading: "Loading...",
  loadingEmployeesError: "Failed to load employees.",
  exportError: "Failed to export attendance.",
  noChangesToSave: "No changes to save.",
  savingInProgress: "Please wait until attendance saving is complete.",
  saveBeforeChangingMonth: "Please save your attendance changes before changing the month.",
  saveBeforeChangingYear: "Please save your attendance changes before changing the year.",
  saveBeforeChangingDepartment: "Please save your attendance changes before changing the department.",
  attendanceSaved: "Attendance saved successfully!",
  saveError: "Failed to save attendance. Please try again.",
  exportExcel: "Export Excel"
},

manageUsers: {
  button: "Manage Users",
  title: "User Management",
  description: "Manage application accounts and permissions.",
  addUser: "Add User",
  close: "Close",
  searchPlaceholder: "Search name or email...",
  showInactive: "Show inactive users",
  loading: "Loading users...",
  name: "Name",
  email: "Email",
  role: "Role",
  department: "Department",
  status: "Status",
  actions: "Actions",
  active: "Active",
  inactive: "Inactive",
  edit: "Edit",
  password: "Password",
  activate: "Activate",
  deactivate: "Deactivate",
  noUsersCreated: "No users have been created yet.",
  noUsersFound: "No users found.",
  editUser: "Edit User",
  addUserTitle: "Add User",
  fullName: "Full name",
  initialPassword: "Initial password",
  selectDepartment: "Select department",
  cancel: "Cancel",
  saving: "Saving...",
  saveUser: "Save User",
  resetPassword: "Reset Password",
  newPasswordPlaceholder: "New password (at least 8 characters)",
  resetting: "Resetting...",
  resetPasswordButton: "Reset Password",
  passwordTooShort: "Password must contain at least 8 characters.",
  assignDepartment: "Please assign a department to this attendance officer.",
  userCreated: "User created successfully.",
  userUpdated: "User updated successfully.",
  userActivated: "User activated successfully.",
  userDeactivated: "User deactivated successfully.",
  passwordResetSuccess: "Password reset successfully.",
  loadError: "Failed to load users.",
  saveError: "Failed to save user.",
  updateError: "Failed to update user.",
  resetPasswordError: "Failed to reset password.",
  confirmStatusChange: "Are you sure you want to {{action}} user {{name}}?",
  actionsLabels: {
    activate: "activate",
    deactivate: "deactivate"
  }
},

    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("app-language") || "fr",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
