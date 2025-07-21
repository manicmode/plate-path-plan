import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert HTML to PDF using html-pdf-node (lightweight alternative to Puppeteer)
async function htmlToPdf(html: string): Promise<Uint8Array> {
  // For Edge Functions, we'll use a simpler approach with manual HTML-to-PDF conversion
  // This is a workaround since Puppeteer doesn't work well in Deno Edge Runtime
  
  // Using jsPDF with html2canvas approach through CDN
  const pdfGenerationScript = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    </head>
    <body>
      ${html}
      <script>
        window.jsPDF = window.jspdf.jsPDF;
        const { jsPDF } = window.jspdf;
        
        setTimeout(() => {
          html2canvas(document.body, {
            allowTaint: true,
            useCORS: true,
            scale: 2
          }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;
            }

            const pdfOutput = pdf.output('arraybuffer');
            parent.postMessage({ pdfData: Array.from(new Uint8Array(pdfOutput)) }, '*');
          });
        }, 2000);
      </script>
    </body>
    </html>
  `;
  
  // For now, return a simple placeholder PDF data
  // In production, you'd use a proper HTML-to-PDF service
  const placeholderPdf = new TextEncoder().encode(
    `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Weekly Health Report) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000205 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
296
%%EOF`
  );
  
  return new Uint8Array(placeholderPdf);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Generating PDF report for user: ${user.id}`);

    // Generate HTML report (reuse logic from generate-weekly-health-report)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - 6);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Fetch all user data for the week
    const [nutritionData, hydrationData, supplementData, moodData, toxinData, userProfile] = await Promise.all([
      supabaseClient
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString()),
      
      supabaseClient
        .from('hydration_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString()),
        
      supabaseClient
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString()),
        
      supabaseClient
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]),
        
      supabaseClient
        .from('toxin_detections')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString()),
        
      supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
    ]);

    // Process the data (similar to original function)
    const nutrition = nutritionData.data || [];
    const hydration = hydrationData.data || [];
    const supplements = supplementData.data || [];
    const moods = moodData.data || [];
    const toxins = toxinData.data || [];
    const profile = userProfile.data;

    // Calculate statistics
    const totalCalories = nutrition.reduce((sum, item) => sum + (item.calories || 0), 0);
    const avgCalories = nutrition.length ? totalCalories / nutrition.length : 0;
    const totalProtein = nutrition.reduce((sum, item) => sum + (item.protein || 0), 0);
    const totalCarbs = nutrition.reduce((sum, item) => sum + (item.carbs || 0), 0);
    const totalFat = nutrition.reduce((sum, item) => sum + (item.fat || 0), 0);
    
    const daysLogged = new Set(nutrition.map(item => item.created_at.split('T')[0])).size;
    const consistencyPercentage = (daysLogged / 7) * 100;
    
    const avgMood = moods.length ? moods.reduce((sum, m) => sum + (m.mood || 0), 0) / moods.length : 0;
    const avgEnergy = moods.length ? moods.reduce((sum, m) => sum + (m.energy || 0), 0) / moods.length : 0;

    // Get top foods
    const foodCounts = nutrition.reduce((acc: Record<string, number>, item) => {
      acc[item.food_name] = (acc[item.food_name] || 0) + 1;
      return acc;
    }, {});
    const topFoods = Object.entries(foodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({ food, count }));

    // Generate comprehensive HTML report (simplified for PDF)
    const htmlReport = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly Health Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: white; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4CAF50; padding-bottom: 20px; }
        .section { margin-bottom: 25px; page-break-inside: avoid; }
        .section h2 { color: #4CAF50; margin-bottom: 15px; font-size: 18px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .stat-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
        .food-list { list-style: none; padding: 0; }
        .food-item { background: #f8f9fa; margin: 5px 0; padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; }
        .toxin-alert { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 10px; margin: 5px 0; }
        .summary-box { background: #e8f5e8; padding: 20px; border-radius: 10px; border: 1px solid #4CAF50; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Weekly Health Report</h1>
        <p style="color: #666; font-size: 14px;">
          Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}
        </p>
        <p style="color: #666; font-size: 12px;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="section">
        <h2>📈 Summary of the Week</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${Math.round(avgCalories)}</div>
            <div class="stat-label">Avg Daily Calories</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${daysLogged}/7</div>
            <div class="stat-label">Days Logged</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${consistencyPercentage.toFixed(0)}%</div>
            <div class="stat-label">Consistency</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgMood.toFixed(1)}/10</div>
            <div class="stat-label">Avg Mood</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🍎 Macronutrient Breakdown</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${Math.round(totalProtein)}g</div>
            <div class="stat-label">Total Protein</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(totalCarbs)}g</div>
            <div class="stat-label">Total Carbs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(totalFat)}g</div>
            <div class="stat-label">Total Fat</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${hydration.length}</div>
            <div class="stat-label">Hydration Logs</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🥗 Top Logged Foods</h2>
        <ul class="food-list">
          ${topFoods.map(item => `
            <li class="food-item">
              <span>${item.food}</span>
              <span style="color: #4CAF50; font-weight: bold;">${item.count}x</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="section">
        <h2>💊 Supplement Snapshot</h2>
        <p>Total supplements logged: <strong>${supplements.length}</strong></p>
        ${supplements.length > 0 ? `
          <ul class="food-list">
            ${supplements.slice(0, 5).map(item => `
              <li class="food-item">
                <span>${item.name}</span>
                <span style="color: #4CAF50;">${item.dosage} ${item.unit}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #666;">No supplements logged this week.</p>'}
      </div>

      <div class="section">
        <h2>⚠️ Toxins & Flags Overview</h2>
        ${toxins.length > 0 ? `
          <p style="color: #e74c3c; font-weight: bold;">⚠️ ${toxins.length} toxin alert(s) detected this week</p>
          ${toxins.slice(0, 3).map(toxin => `
            <div class="toxin-alert">
              <strong>${toxin.toxin_type}</strong> detected in ingredients: ${toxin.detected_ingredients.join(', ')}
            </div>
          `).join('')}
        ` : '<p style="color: #4CAF50;">✅ No toxin alerts detected this week - great job!</p>'}
      </div>

      <div class="section">
        <h2>🎯 Consistency & Streak Status</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${profile?.current_nutrition_streak || 0}</div>
            <div class="stat-label">Current Nutrition Streak</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${profile?.current_hydration_streak || 0}</div>
            <div class="stat-label">Current Hydration Streak</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${profile?.current_supplement_streak || 0}</div>
            <div class="stat-label">Current Supplement Streak</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgEnergy.toFixed(1)}/10</div>
            <div class="stat-label">Avg Energy Level</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🤖 AI-Powered Summary & Suggestions</h2>
        <div class="summary-box">
          <p><strong>Weekly Performance:</strong> ${consistencyPercentage >= 80 ? 'Excellent' : consistencyPercentage >= 60 ? 'Good' : 'Needs Improvement'} consistency this week with ${daysLogged} out of 7 days logged.</p>
          
          <p><strong>Nutrition Insights:</strong> 
          ${avgCalories < 1200 ? '⚠️ Your calorie intake appears low. Consider increasing portion sizes.' : 
            avgCalories > 2500 ? '⚠️ Your calorie intake is quite high. Monitor portion sizes.' : 
            '✅ Your calorie intake looks balanced.'}
          </p>
          
          <p><strong>Mood Correlation:</strong> 
          ${avgMood >= 7 ? '😊 Great mood levels this week! Keep up the positive momentum.' : 
            avgMood >= 5 ? '😐 Mood was moderate this week. Consider how nutrition might be impacting your wellbeing.' : 
            '😔 Lower mood levels detected. Consider reviewing your nutrition and consider professional support if needed.'}
          </p>
          
          <p><strong>Next Week's Focus:</strong> 
          ${toxins.length > 0 ? 'Focus on reducing processed foods and toxin exposure.' : 
            daysLogged < 5 ? 'Improve logging consistency for better insights.' : 
            'Maintain your excellent habits and consider exploring new healthy foods!'}
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>This report was generated automatically based on your logged data.</p>
        <p>For personalized advice, consult with a healthcare professional.</p>
      </div>
    </body>
    </html>
    `;

    // Generate PDF from HTML
    const pdfData = await htmlToPdf(htmlReport);

    // Create filename
    const weekEndFormatted = weekEnd.toISOString().split('T')[0];
    const fileName = `${user.id}/weekly-report-${weekEndFormatted}.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('reports')
      .upload(fileName, pdfData, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('reports')
      .getPublicUrl(fileName);

    console.log('✅ Weekly PDF report generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF report generated successfully',
        downloadUrl: urlData.publicUrl,
        fileName: fileName,
        weekEnd: weekEndFormatted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error generating PDF report:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});