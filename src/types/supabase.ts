export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          name: string;
          category: string;
          due_date: string;
          description: string;
          status: string;
          user_id: string;
          created_at: string;
          is_admin_task: boolean;
          section_id?: string;
          google_drive_links?: string[];
          attachments?: string[];
          original_file_names?: string[];
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          due_date: string;
          description: string;
          status: string;
          user_id: string;
          created_at?: string;
          is_admin_task?: boolean;
          section_id?: string;
          google_drive_links?: string[];
          attachments?: string[];
          original_file_names?: string[];
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          due_date?: string;
          description?: string;
          status?: string;
          user_id?: string;
          created_at?: string;
          is_admin_task?: boolean;
          section_id?: string;
          google_drive_links?: string[];
          attachments?: string[];
          original_file_names?: string[];
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role: string;
          created_at: string;
          last_active: string;
          phone?: string;
          student_id?: string;
          department_id?: string;
          batch_id?: string;
          section_id?: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          role?: string;
          created_at?: string;
          last_active?: string;
          phone?: string;
          student_id?: string;
          department_id?: string;
          batch_id?: string;
          section_id?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          role?: string;
          created_at?: string;
          last_active?: string;
          phone?: string;
          student_id?: string;
          department_id?: string;
          batch_id?: string;
          section_id?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      fcm_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: 'android' | 'ios' | 'web';
          device_info: Record<string, any>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'android' | 'ios' | 'web';
          device_info?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: 'android' | 'ios' | 'web';
          device_info?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      batches: {
        Row: {
          id: string;
          name: string;
          department_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          department_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          department_id?: string;
          created_at?: string;
        };
      };
      sections: {
        Row: {
          id: string;
          name: string;
          batch_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          batch_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          batch_id?: string;
          created_at?: string;
        };
      };
      lecture_slides: {
        Row: {
          id: string;
          title: string;
          description: string;
          section_id: string;
          file_urls: string[];
          original_file_names: string[];
          slide_links: string[];
          video_links: string[];
          created_at: string;
          created_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          section_id: string;
          file_urls?: string[];
          original_file_names?: string[];
          slide_links?: string[];
          video_links?: string[];
          created_at?: string;
          created_by?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          section_id?: string;
          file_urls?: string[];
          original_file_names?: string[];
          slide_links?: string[];
          video_links?: string[];
          updated_at?: string;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      delete_user: {
        Args: { user_id: string };
        Returns: void;
      };
      get_user_stats: {
        Args: Record<string, never>;
        Returns: {
          total_users: number;
          active_today: number;
          new_this_week: number;
        };
      };
    };
  };
}