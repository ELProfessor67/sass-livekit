// server/csv-management.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

export const csvManagementRouter = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Delete a CSV file
 * DELETE /api/v1/csv/:id
 */
csvManagementRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get CSV file details first to check if it exists
    const { data: csvFile, error: fetchError } = await supabase
      .from('csv_files')
      .select('id, name, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !csvFile) {
      return res.status(404).json({
        success: false,
        message: 'CSV file not found'
      });
    }

    // Check if any campaigns are using this CSV file
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, execution_status')
      .eq('csv_file_id', id);

    if (campaignsError) {
      console.error('Error checking campaigns:', campaignsError);
    }

    if (campaigns && campaigns.length > 0) {
      const activeCampaigns = campaigns.filter(c => c.execution_status === 'running');
      if (activeCampaigns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete CSV file. It is being used by ${activeCampaigns.length} running campaign(s). Please stop the campaigns first.`,
          campaigns: activeCampaigns.map(c => ({ id: c.id, name: c.name }))
        });
      }

      return res.status(400).json({
        success: false,
        message: `Cannot delete CSV file. It is being used by ${campaigns.length} campaign(s). Please delete or change the campaigns first.`,
        campaigns: campaigns.map(c => ({ id: c.id, name: c.name }))
      });
    }

    // Delete the CSV file (this will cascade delete related csv_contacts due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('csv_files')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      message: 'CSV file deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting CSV file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete CSV file',
      error: error.message
    });
  }
});

/**
 * Get CSV file details
 * GET /api/v1/csv/:id
 */
csvManagementRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: csvFile, error } = await supabase
      .from('csv_files')
      .select(`
        *,
        csv_contacts(count)
      `)
      .eq('id', id)
      .single();

    if (error || !csvFile) {
      return res.status(404).json({
        success: false,
        message: 'CSV file not found'
      });
    }

    res.json({
      success: true,
      csvFile: {
        ...csvFile,
        contact_count: csvFile.csv_contacts?.[0]?.count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching CSV file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CSV file'
    });
  }
});
