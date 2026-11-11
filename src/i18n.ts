
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
          roles: {
          SUPER_ADMIN: "Administrateur",
  MANAGER: "Manageur",
  ATTENDANCE_OFFICER: "Résponsable Directe",
  VISITOR: "Visiteur"
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
              loginTitle: "Attendance Management System SOMIK",
              info: "Sign in to access your account"
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
      roles: {
          SUPER_ADMIN: "Administrator",
  MANAGER: "Manager",
  ATTENDANCE_OFFICER: "Attendance Officier",
  VISITOR: "Visitor"
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
