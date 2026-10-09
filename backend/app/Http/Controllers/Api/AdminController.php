<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Admin dashboard summary.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $totalProducts = Product::count();
        $activeProducts = Product::where('is_active', true)->count();
        $totalUsers = User::count();
        $totalOrders = Order::count();

        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $completedOrders = Order::where('status', 'delivered')->count();
        $cancelledOrders = Order::where('status', 'cancelled')->count();

        $paidOrders = Order::where('payment_status', 'paid')->count();
        $unpaidOrders = Order::where('payment_status', 'unpaid')->count();

        $totalSales = Order::where('payment_status', 'paid')
            ->where('status', '!=', 'cancelled')
            ->sum('total');

        return response()->json([
            'success' => true,
            'data' => [
                'products' => [
                    'total' => $totalProducts,
                    'active' => $activeProducts,
                ],
                'users' => [
                    'total' => $totalUsers,
                ],
                'orders' => [
                    'total' => $totalOrders,
                    'pending' => $pendingOrders,
                    'processing' => $processingOrders,
                    'completed' => $completedOrders,
                    'cancelled' => $cancelledOrders,
                ],
                'payments' => [
                    'paid' => $paidOrders,
                    'unpaid' => $unpaidOrders,
                ],
                'sales' => [
                    'total' => $totalSales,
                ],
            ],
        ]);
    }
}