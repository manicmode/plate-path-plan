import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Generating weekly health report...");

    const reportHtml = generateWeeklyReportHTML();
    
    console.log("✅ Weekly report generated successfully");

    return new Response(reportHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error("❌ Error generating weekly report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateWeeklyReportHTML(): string {
  const currentDate = new Date();
  const weekStart = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Health Report - ${currentDate.toLocaleDateString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #ffffff;
            color: #333333;
            line-height: 1.6;
            padding: 40px 20px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 30px;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            color: #4f46e5;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .date-range {
            font-size: 1.2rem;
            color: #6b7280;
            font-weight: 500;
        }
        
        .section {
            margin-bottom: 50px;
            background: #fafafa;
            border-radius: 12px;
            padding: 30px;
            border-left: 5px solid #4f46e5;
        }
        
        .section h2 {
            font-size: 1.8rem;
            color: #1f2937;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section h3 {
            font-size: 1.3rem;
            color: #374151;
            margin-bottom: 15px;
            margin-top: 25px;
        }
        
        .chart-container {
            position: relative;
            height: 300px;
            margin: 25px 0;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .chart-container canvas {
            max-height: 260px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
        }
        
        .stat-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #4f46e5;
            display: block;
        }
        
        .stat-card .label {
            color: #6b7280;
            font-size: 0.9rem;
            margin-top: 5px;
        }
        
        .progress-bar {
            background: #e5e7eb;
            border-radius: 10px;
            height: 20px;
            margin: 10px 0;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399);
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .food-list {
            list-style: none;
            background: white;
            border-radius: 8px;
            padding: 20px;
        }
        
        .food-list li {
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
        }
        
        .food-list li:last-child {
            border-bottom: none;
        }
        
        .summary-text {
            background: white;
            padding: 25px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
            font-size: 1.1rem;
            line-height: 1.8;
        }
        
        .alert-item {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            color: #dc2626;
        }
        
        .recommendation {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            color: #0369a1;
        }
        
        .supplement-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .supplement-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #e5e7eb;
        }
        
        .supplement-card.taken {
            border-color: #10b981;
            background: #f0fdf4;
        }
        
        .supplement-card.missed {
            border-color: #ef4444;
            background: #fef2f2;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .section {
                break-inside: avoid;
                margin-bottom: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🩺 Weekly Health Report</h1>
        <div class="date-range">
            ${weekStart.toLocaleDateString()} - ${currentDate.toLocaleDateString()}
        </div>
    </div>

    <div class="section">
        <h2>📊 Summary of the Week</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <span class="value">1,847</span>
                <div class="label">Avg Daily Calories</div>
            </div>
            <div class="stat-card">
                <span class="value">6/7</span>
                <div class="label">Days Logged</div>
            </div>
            <div class="stat-card">
                <span class="value">85%</span>
                <div class="label">Goal Achievement</div>
            </div>
            <div class="stat-card">
                <span class="value">7.2</span>
                <div class="label">Avg Health Score</div>
            </div>
        </div>
        
        <div class="summary-text">
            <strong>Weekly Performance:</strong> Great consistency this week! You maintained excellent logging habits and stayed within your target ranges for most macronutrients. Your hydration improved significantly compared to last week.
        </div>
    </div>

    <div class="section">
        <h2>🥗 Macronutrient Trends</h2>
        <div class="chart-container">
            <canvas id="macroChart"></canvas>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <span class="value">128g</span>
                <div class="label">Avg Protein</div>
            </div>
            <div class="stat-card">
                <span class="value">203g</span>
                <div class="label">Avg Carbs</div>
            </div>
            <div class="stat-card">
                <span class="value">72g</span>
                <div class="label">Avg Fat</div>
            </div>
            <div class="stat-card">
                <span class="value">28g</span>
                <div class="label">Avg Fiber</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🎯 Micronutrient Radar</h2>
        <div class="chart-container">
            <canvas id="microChart"></canvas>
        </div>
        <p>Your vitamin and mineral intake compared to recommended daily values. Most nutrients are well within optimal ranges, with room for improvement in Vitamin D and Iron.</p>
    </div>

    <div class="section">
        <h2>⚠️ Toxins & Flags Overview</h2>
        <div class="chart-container">
            <canvas id="toxinChart"></canvas>
        </div>
        
        <div class="alert-item">
            <strong>⚠️ High Sodium Alert:</strong> Tuesday exceeded recommended sodium intake by 340mg. Consider reducing processed foods.
        </div>
        
        <div class="alert-item">
            <strong>🍭 Added Sugar Notice:</strong> Weekend showed elevated sugar intake from desserts. Monitor portion sizes.
        </div>
    </div>

    <div class="section">
        <h2>😊 Mood vs. Nutrition</h2>
        <div class="chart-container">
            <canvas id="moodChart"></canvas>
        </div>
        <p>Correlation between your daily mood scores and nutritional quality. Higher quality meals tend to correlate with improved mood ratings throughout the week.</p>
    </div>

    <div class="section">
        <h2>💊 Supplement Snapshot</h2>
        <div class="supplement-grid">
            <div class="supplement-card taken">
                <div><strong>Vitamin D3</strong></div>
                <div>6/7 days</div>
            </div>
            <div class="supplement-card taken">
                <div><strong>Omega-3</strong></div>
                <div>7/7 days</div>
            </div>
            <div class="supplement-card missed">
                <div><strong>Magnesium</strong></div>
                <div>4/7 days</div>
            </div>
            <div class="supplement-card taken">
                <div><strong>B-Complex</strong></div>
                <div>5/7 days</div>
            </div>
        </div>
        
        <div class="recommendation">
            <strong>💡 Recommendation:</strong> Set a daily reminder for Magnesium - you missed 3 days this week. Consider taking it with dinner for better consistency.
        </div>
    </div>

    <div class="section">
        <h2>🔥 Consistency & Streak Status</h2>
        <h3>Nutrition Logging</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 86%"></div>
        </div>
        <p>6 out of 7 days logged - 86% consistency (Current streak: 12 days)</p>
        
        <h3>Hydration Tracking</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 71%"></div>
        </div>
        <p>5 out of 7 days tracked - 71% consistency (Current streak: 3 days)</p>
        
        <h3>Exercise Logging</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 57%"></div>
        </div>
        <p>4 out of 7 days logged - 57% consistency (Current streak: 2 days)</p>
    </div>

    <div class="section">
        <h2>🍽️ Top Logged Foods</h2>
        <ul class="food-list">
            <li>
                <span>Grilled Chicken Breast</span>
                <span>5 times</span>
            </li>
            <li>
                <span>Greek Yogurt</span>
                <span>4 times</span>
            </li>
            <li>
                <span>Brown Rice</span>
                <span>4 times</span>
            </li>
            <li>
                <span>Almonds</span>
                <span>3 times</span>
            </li>
            <li>
                <span>Spinach Salad</span>
                <span>3 times</span>
            </li>
        </ul>
    </div>

    <div class="section">
        <h2>🤖 AI-Powered Summary & Suggestions</h2>
        <div class="summary-text">
            <strong>Overall Assessment:</strong> Excellent week with strong adherence to your nutrition goals! Your protein intake was consistently above target, supporting your fitness objectives. The variety in your vegetable intake improved significantly.
        </div>
        
        <div class="recommendation">
            <strong>🎯 Next Week's Focus:</strong>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Increase fiber intake by adding more legumes to meals</li>
                <li>Improve hydration consistency - aim for 8 glasses daily</li>
                <li>Consider meal prep on Sundays to maintain weekend logging</li>
                <li>Try incorporating more colorful vegetables for micronutrient diversity</li>
            </ul>
        </div>
        
        <div class="recommendation">
            <strong>🏆 Achievements Unlocked:</strong>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Protein Champion - 7 days above target</li>
                <li>Consistency King - 12-day logging streak</li>
                <li>Omega-3 Master - Perfect supplement adherence</li>
            </ul>
        </div>
    </div>

    <script>
        // Macronutrient Trends Chart
        const macroCtx = document.getElementById('macroChart').getContext('2d');
        new Chart(macroCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Protein (g)',
                    data: [125, 142, 118, 136, 129, 108, 134],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3
                }, {
                    label: 'Carbs (g)',
                    data: [198, 234, 189, 210, 195, 168, 227],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.3
                }, {
                    label: 'Fat (g)',
                    data: [68, 79, 65, 74, 70, 58, 82],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Macronutrient Intake'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Micronutrient Radar Chart
        const microCtx = document.getElementById('microChart').getContext('2d');
        new Chart(microCtx, {
            type: 'radar',
            data: {
                labels: ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Iron', 'Calcium', 'Magnesium', 'Zinc', 'B12'],
                datasets: [{
                    label: 'Your Intake (%RDA)',
                    data: [95, 120, 45, 68, 88, 92, 105, 134],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    pointBackgroundColor: '#4f46e5'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 150,
                        ticks: {
                            stepSize: 30
                        }
                    }
                }
            }
        });

        // Toxins & Flags Chart
        const toxinCtx = document.getElementById('toxinChart').getContext('2d');
        new Chart(toxinCtx, {
            type: 'bar',
            data: {
                labels: ['Sodium', 'Added Sugar', 'Trans Fat', 'Artificial Colors', 'Preservatives'],
                datasets: [{
                    label: 'Risk Level',
                    data: [75, 45, 12, 8, 23],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(245, 158, 11, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Toxin Exposure Levels'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Risk Level (%)'
                        }
                    }
                }
            }
        });

        // Mood vs Nutrition Chart
        const moodCtx = document.getElementById('moodChart').getContext('2d');
        new Chart(moodCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Mood Score',
                    data: [7.2, 6.8, 8.1, 7.5, 8.3, 6.9, 7.8],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    yAxisID: 'y'
                }, {
                    label: 'Nutrition Quality',
                    data: [8.1, 7.3, 8.7, 8.2, 8.9, 6.8, 8.4],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Mood Score'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Nutrition Quality'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}